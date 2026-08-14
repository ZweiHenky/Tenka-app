import { LogLevel, OneSignal } from "react-native-onesignal"
import { env } from "@/infrastructure/config/env"

let initialized = false

export function initializeOneSignal(): boolean {
  if (initialized) return true
  if (!env.ONESIGNAL_APP_ID) return false

  OneSignal.Debug.setLogLevel(LogLevel.Warn)
  OneSignal.initialize(env.ONESIGNAL_APP_ID)
  initialized = true
  return true
}
