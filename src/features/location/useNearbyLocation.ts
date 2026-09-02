import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Linking, Platform } from "react-native"
import { expoLocationAdapter, foregroundPermission, reverseGeocodeLocation } from "./expo-location-adapter"
import { LOCATION_MAX_AGE_MS, LocationResolutionError, formatLocationLabel, resolveNearbyCoordinates, type NearbyCoordinates } from "./location-policy"
import { useNearbyLocationPreferenceStore } from "@/stores/nearbyLocationPreferenceStore"

export type NearbyLocationStatus = "checking" | "disabled" | "idle" | "locating" | "ready" | "denied" | "blocked" | "web-blocked" | "services-disabled" | "error"

interface SessionLocation {
  coordinates: NearbyCoordinates
  label?: string
  obtainedAt: number
}

let sessionLocation: SessionLocation | undefined
let sessionRequest: Promise<SessionLocation> | undefined
let sessionGeneration = 0

class LocationRequestCancelledError extends Error {}

export function clearNearbyLocationSession(): void {
  sessionGeneration += 1
  sessionLocation = undefined
  sessionRequest = undefined
}

export function resetNearbyLocationSessionForTests(): void {
  clearNearbyLocationSession()
}

function locateOnce(forceCurrent = false): Promise<SessionLocation> {
  if (!forceCurrent && sessionLocation) return Promise.resolve(sessionLocation)
  if (forceCurrent) sessionRequest = undefined
  const generation = sessionGeneration
  sessionRequest ??= resolveNearbyCoordinates(expoLocationAdapter, { forceCurrent })
    .then(async (coordinates) => {
      if (generation !== sessionGeneration) throw new LocationRequestCancelledError()
      let label: string | undefined
      try {
        label = formatLocationLabel((await reverseGeocodeLocation(coordinates.latitude, coordinates.longitude))[0])
      } catch {
        label = undefined
      }
      if (generation !== sessionGeneration) throw new LocationRequestCancelledError()
      const location = { coordinates, label, obtainedAt: Date.now() }
      sessionLocation = location
      return location
    })
    .catch((error) => {
      if (generation === sessionGeneration) sessionRequest = undefined
      throw error
    })
  return sessionRequest
}

function failureStatus(error: unknown): NearbyLocationStatus {
  if (error instanceof LocationResolutionError) {
    return error.kind === "services-disabled" ? "services-disabled" : "error"
  }
  return "error"
}

export function useNearbyLocation() {
  const enabled = useNearbyLocationPreferenceStore((state) => state.enabled)
  const hasHydrated = useNearbyLocationPreferenceStore((state) => state.hasHydrated)
  const setEnabled = useNearbyLocationPreferenceStore((state) => state.setEnabled)
  const activationInProgressRef = useRef(false)
  const [coordinates, setCoordinates] = useState<NearbyCoordinates | undefined>(enabled ? sessionLocation?.coordinates : undefined)
  const [label, setLabel] = useState<string | undefined>(enabled ? sessionLocation?.label : undefined)
  const [status, setStatus] = useState<NearbyLocationStatus>(hasHydrated ? enabled ? sessionLocation ? "ready" : "checking" : "disabled" : "checking")

  const resolveGrantedLocation = useCallback(async (forceCurrent = false) => {
    setStatus("locating")
    try {
      const next = await locateOnce(forceCurrent)
      if (!useNearbyLocationPreferenceStore.getState().enabled) return
      setCoordinates(next.coordinates)
      setLabel(next.label)
      setStatus("ready")
    } catch (error) {
      if (error instanceof LocationRequestCancelledError) return
      setStatus(failureStatus(error))
    }
  }, [])

  const refreshPermission = useCallback(async () => {
    try {
      const permission = await foregroundPermission.get()
      if (!useNearbyLocationPreferenceStore.getState().enabled) return
      if (permission.granted) {
        const stale = Boolean(sessionLocation && Date.now() - sessionLocation.obtainedAt >= LOCATION_MAX_AGE_MS)
        if (sessionLocation && !stale) {
          setCoordinates(sessionLocation.coordinates)
          setLabel(sessionLocation.label)
          setStatus("ready")
          return
        }
        await resolveGrantedLocation(stale)
      } else {
        clearNearbyLocationSession()
        setCoordinates(undefined)
        setLabel(undefined)
        setStatus(permission.status === "undetermined"
          ? "idle"
          : Platform.OS === "web"
            ? "web-blocked"
            : permission.canAskAgain ? "denied" : "blocked")
      }
    } catch {
      setStatus("error")
    }
  }, [resolveGrantedLocation])

  useEffect(() => {
    if (!hasHydrated) return
    if (!enabled) {
      clearNearbyLocationSession()
      const timer = setTimeout(() => {
        setCoordinates(undefined)
        setLabel(undefined)
        setStatus("disabled")
      }, 0)
      return () => clearTimeout(timer)
    }
    if (activationInProgressRef.current) return
    if (sessionLocation) return
    const timer = setTimeout(() => { void refreshPermission() }, 0)
    return () => clearTimeout(timer)
  }, [enabled, hasHydrated, refreshPermission])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && enabled && hasHydrated) void refreshPermission()
    })
    return () => subscription.remove()
  }, [enabled, hasHydrated, refreshPermission])

  const activate = useCallback(async () => {
    const isReactivating = !enabled
    if (isReactivating) {
      activationInProgressRef.current = true
      setEnabled(true)
    }
    try {
      if (status === "blocked") {
        await Linking.openSettings()
        return
      }
      if (status === "services-disabled" || status === "error") {
        await resolveGrantedLocation()
        return
      }

      setStatus("locating")
      const permission = await foregroundPermission.request()
      if (!permission.granted) {
        setStatus(Platform.OS === "web" ? "web-blocked" : permission.canAskAgain ? "denied" : "blocked")
        return
      }
      await resolveGrantedLocation()
    } catch {
      setStatus("error")
    } finally {
      if (isReactivating) activationInProgressRef.current = false
    }
  }, [enabled, resolveGrantedLocation, setEnabled, status])

  const refresh = useCallback(async () => {
    if (!enabled) return
    const permission = await foregroundPermission.get()
    if (!permission.granted) {
      await activate()
      return
    }
    await resolveGrantedLocation(true)
  }, [activate, enabled, resolveGrantedLocation])

  return {
    coordinates: hasHydrated && enabled ? coordinates : undefined,
    label: hasHydrated && enabled ? label : undefined,
    status: hasHydrated ? enabled ? status : "disabled" : "checking",
    activate,
    refresh,
  }
}
