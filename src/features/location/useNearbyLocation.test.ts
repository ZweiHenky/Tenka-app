// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetNearbyLocationSessionForTests, useNearbyLocation } from "./useNearbyLocation"
import { LOCATION_MAX_AGE_MS } from "./location-policy"
import { useNearbyLocationPreferenceStore } from "@/stores/nearbyLocationPreferenceStore"

const mocks = vi.hoisted(() => ({
  getPermission: vi.fn(),
  requestPermission: vi.fn(),
  services: vi.fn(),
  known: vi.fn(),
  current: vi.fn(),
  openSettings: vi.fn(),
  reverse: vi.fn(),
  platform: { OS: "ios" },
  appStateListener: undefined as ((state: string) => void) | undefined,
}))

vi.mock("./expo-location-adapter", () => ({
  expoLocationAdapter: {
    hasServicesEnabled: mocks.services,
    getLastKnown: mocks.known,
    getCurrent: mocks.current,
  },
  foregroundPermission: {
    get: mocks.getPermission,
    request: mocks.requestPermission,
  },
  reverseGeocodeLocation: mocks.reverse,
}))

vi.mock("@/stores/nearbyLocationPreferenceStore", async () => {
  const { create } = await vi.importActual<typeof import("zustand")>("zustand")
  const store = create<{
    enabled: boolean
    hasHydrated: boolean
    setEnabled: (enabled: boolean) => void
  }>((set) => ({
    enabled: true,
    hasHydrated: true,
    setEnabled: (enabled) => set({ enabled }),
  }))
  return { useNearbyLocationPreferenceStore: store }
})

vi.mock("react-native", () => ({
  AppState: { addEventListener: vi.fn((_event: string, listener: (state: string) => void) => {
    mocks.appStateListener = listener
    return { remove: vi.fn() }
  }) },
  Linking: { openSettings: mocks.openSettings },
  Platform: mocks.platform,
}))

describe("useNearbyLocation", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    resetNearbyLocationSessionForTests()
    useNearbyLocationPreferenceStore.setState({ enabled: true, hasHydrated: true })
    mocks.platform.OS = "ios"
    mocks.appStateListener = undefined
    mocks.services.mockResolvedValue(true)
    mocks.known.mockResolvedValue({ coords: { latitude: 19.4326, longitude: -99.1332 } })
    mocks.reverse.mockResolvedValue([{ district: "Cuauhtémoc", region: "Ciudad de México" }])
  })

  it("locates automatically when foreground permission was already granted", async () => {
    mocks.getPermission.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true })
    const { result } = renderHook(() => useNearbyLocation())

    await waitFor(() => expect(result.current.status).toBe("ready"))

    expect(result.current.coordinates).toEqual({ latitude: 19.433, longitude: -99.133 })
    expect(result.current.label).toBe("Cuauhtémoc, Ciudad de México")
    expect(mocks.requestPermission).not.toHaveBeenCalled()
  })

  it("forces a fresh position and label on manual refresh", async () => {
    mocks.getPermission.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true })
    mocks.current.mockResolvedValue({ coords: { latitude: 25.6866, longitude: -100.3161 } })
    const { result } = renderHook(() => useNearbyLocation())
    await waitFor(() => expect(result.current.status).toBe("ready"))
    mocks.reverse.mockResolvedValue([{ city: "Monterrey", region: "Nuevo León" }])

    await act(async () => { await result.current.refresh() })

    expect(mocks.current).toHaveBeenCalledOnce()
    expect(result.current.coordinates).toEqual({ latitude: 25.687, longitude: -100.316 })
    expect(result.current.label).toBe("Monterrey, Nuevo León")
  })

  it("refreshes on foreground when the session location is five minutes old", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000)
    mocks.getPermission.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true })
    mocks.current.mockResolvedValue({ coords: { latitude: 20.7, longitude: -103.4 } })
    const { result } = renderHook(() => useNearbyLocation())
    await waitFor(() => expect(result.current.status).toBe("ready"))
    vi.mocked(Date.now).mockReturnValue(1_000 + LOCATION_MAX_AGE_MS)

    act(() => { mocks.appStateListener?.("active") })

    await waitFor(() => expect(mocks.current).toHaveBeenCalledOnce())
    expect(result.current.coordinates).toEqual({ latitude: 20.7, longitude: -103.4 })
  })

  it("waits for the discrete action before requesting first-time permission", async () => {
    mocks.getPermission.mockResolvedValue({ granted: false, status: "undetermined", canAskAgain: true })
    mocks.requestPermission.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true })
    const { result } = renderHook(() => useNearbyLocation())
    await waitFor(() => expect(result.current.status).toBe("idle"))
    expect(mocks.requestPermission).not.toHaveBeenCalled()

    await act(async () => { await result.current.activate() })

    expect(mocks.requestPermission).toHaveBeenCalledOnce()
    expect(result.current.status).toBe("ready")
  })

  it("opens system settings when permission is blocked", async () => {
    mocks.getPermission.mockResolvedValue({ granted: false, status: "denied", canAskAgain: false })
    const { result } = renderHook(() => useNearbyLocation())
    await waitFor(() => expect(result.current.status).toBe("blocked"))

    await act(async () => { await result.current.activate() })

    expect(mocks.openSettings).toHaveBeenCalledOnce()
    expect(mocks.requestPermission).not.toHaveBeenCalled()
  })

  it("does not offer native settings for a blocked browser permission", async () => {
    mocks.platform.OS = "web"
    mocks.getPermission.mockResolvedValue({ granted: false, status: "denied", canAskAgain: true })
    const { result } = renderHook(() => useNearbyLocation())

    await waitFor(() => expect(result.current.status).toBe("web-blocked"))

    expect(mocks.openSettings).not.toHaveBeenCalled()
    expect(mocks.requestPermission).not.toHaveBeenCalled()
  })

  it("does not consult permission or GPS while nearby leagues are disabled", async () => {
    useNearbyLocationPreferenceStore.setState({ enabled: false })

    const { result } = renderHook(() => useNearbyLocation())

    await waitFor(() => expect(result.current.status).toBe("disabled"))
    expect(result.current.coordinates).toBeUndefined()
    expect(mocks.getPermission).not.toHaveBeenCalled()
    expect(mocks.known).not.toHaveBeenCalled()
  })

  it("clears the session and can reactivate from Home", async () => {
    mocks.getPermission.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true })
    mocks.requestPermission.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true })
    const { result } = renderHook(() => useNearbyLocation())
    await waitFor(() => expect(result.current.status).toBe("ready"))

    act(() => useNearbyLocationPreferenceStore.getState().setEnabled(false))
    await waitFor(() => expect(result.current.status).toBe("disabled"))
    expect(result.current.coordinates).toBeUndefined()

    await act(async () => { await result.current.activate() })

    expect(useNearbyLocationPreferenceStore.getState().enabled).toBe(true)
    expect(mocks.requestPermission).toHaveBeenCalledOnce()
    expect(result.current.status).toBe("ready")
  })

  it("discards an in-flight location result after disabling", async () => {
    let resolveCurrent!: (value: { coords: { latitude: number; longitude: number } }) => void
    mocks.getPermission.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true })
    mocks.known.mockResolvedValue(null)
    mocks.current.mockReturnValue(new Promise((resolve) => { resolveCurrent = resolve }))
    const { result } = renderHook(() => useNearbyLocation())
    await waitFor(() => expect(result.current.status).toBe("locating"))

    act(() => useNearbyLocationPreferenceStore.getState().setEnabled(false))
    await waitFor(() => expect(result.current.status).toBe("disabled"))
    await act(async () => {
      resolveCurrent({ coords: { latitude: 20.67, longitude: -103.35 } })
      await Promise.resolve()
    })

    expect(result.current.status).toBe("disabled")
    expect(result.current.coordinates).toBeUndefined()
  })
})
