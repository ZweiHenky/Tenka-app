import * as Location from "expo-location"
import { Platform } from "react-native"
import type { LocationAdapter } from "./location-policy"

function getFreshWebLocation(): Promise<{ coords: { latitude: number; longitude: number } }> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ coords: { latitude: position.coords.latitude, longitude: position.coords.longitude } }),
      reject,
      { enableHighAccuracy: false, maximumAge: 0 },
    )
  })
}

export const expoLocationAdapter: LocationAdapter = {
  hasServicesEnabled: () => Location.hasServicesEnabledAsync(),
  getLastKnown: (options) => Location.getLastKnownPositionAsync(options),
  getCurrent: () => Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation
    ? getFreshWebLocation()
    : Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      }),
}

export const foregroundPermission = {
  get: () => Location.getForegroundPermissionsAsync(),
  request: () => Location.requestForegroundPermissionsAsync(),
}

export async function reverseGeocodeLocation(latitude: number, longitude: number) {
  return Location.reverseGeocodeAsync({ latitude, longitude })
}
