export const env = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8081",
  GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "",
  ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? "",
} as const

export type Env = typeof env
