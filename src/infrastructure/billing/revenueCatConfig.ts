import type { AppEnv } from "@/infrastructure/config/env"

export type RevenueCatPlatform = "ios" | "android"

type RevenueCatPublicKeys = {
  apple: string
  google: string
}

export function revenueCatApiKeyForPlatform(
  platform: string,
  keys: RevenueCatPublicKeys,
): string | null {
  if (platform === "ios") return keys.apple
  if (platform === "android") return keys.google
  return null
}

export function revenueCatLogLevel(appEnvironment: AppEnv): "DEBUG" | "WARN" {
  return appEnvironment === "local" ? "DEBUG" : "WARN"
}
