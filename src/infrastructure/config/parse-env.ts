export type AppEnv = "local" | "preview" | "production"

export type PublicEnvInput = {
  EXPO_PUBLIC_APP_ENV?: string
  EXPO_PUBLIC_API_URL?: string
  EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY?: string
  EXPO_PUBLIC_GOOGLE_PLACES_IOS_API_KEY?: string
  EXPO_PUBLIC_GOOGLE_PLACES_WEB_API_KEY?: string
  EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1?: string
  EXPO_PUBLIC_ONESIGNAL_APP_ID?: string
  EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?: string
  EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?: string
  EXPO_PUBLIC_BILLING_GOOGLE_SANDBOX_PURCHASES?: string
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?: string
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string
}

const requiredNames = [
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY",
  "EXPO_PUBLIC_GOOGLE_PLACES_IOS_API_KEY",
  "EXPO_PUBLIC_GOOGLE_PLACES_WEB_API_KEY",
  "EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1",
  "EXPO_PUBLIC_ONESIGNAL_APP_ID",
  "EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY",
  "EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
] as const

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return true
  if (host === "0.0.0.0" || host.startsWith("127.") || host.startsWith("10.")) return true
  if (host.startsWith("192.168.") || host.startsWith("169.254.")) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
  return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")
}

export function parseEnv(input: PublicEnvInput) {
  const appEnv = input.EXPO_PUBLIC_APP_ENV?.trim()
  if (appEnv !== "local" && appEnv !== "preview" && appEnv !== "production") {
    throw new Error("EXPO_PUBLIC_APP_ENV must be local, preview, or production")
  }

  for (const name of requiredNames) {
    if (!input[name]?.trim()) throw new Error(`${name} is required`)
  }

  let apiUrl: URL
  try {
    apiUrl = new URL(input.EXPO_PUBLIC_API_URL!)
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL must be a valid URL")
  }

  if (appEnv === "production") {
    if (apiUrl.protocol !== "https:") {
      throw new Error("EXPO_PUBLIC_API_URL must use HTTPS in production")
    }
    if (isPrivateOrLocalHostname(apiUrl.hostname) || apiUrl.hostname.toLowerCase().includes("ngrok")) {
      throw new Error("EXPO_PUBLIC_API_URL must use a stable public host in production")
    }
  }

  const sha1 = input.EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1!.trim().replace(/:/g, "")
  if (!/^[a-f0-9]{40}$/i.test(sha1)) {
    throw new Error("EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1 must be a SHA-1 fingerprint")
  }
  const normalizedSha1 = sha1.match(/.{2}/g)!.join(":").toUpperCase()

  const revenueCatAppleApiKey = input.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY!.trim()
  if (!revenueCatAppleApiKey.startsWith("appl_") || revenueCatAppleApiKey.length === "appl_".length) {
    throw new Error("EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY must be an Apple Public SDK Key starting with appl_")
  }
  const revenueCatGoogleApiKey = input.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY!.trim()
  if (!revenueCatGoogleApiKey.startsWith("goog_") || revenueCatGoogleApiKey.length === "goog_".length) {
    throw new Error("EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY must be a Google Public SDK Key starting with goog_")
  }
  const sandboxPurchases = input.EXPO_PUBLIC_BILLING_GOOGLE_SANDBOX_PURCHASES?.trim() || "false"
  if (sandboxPurchases !== "true" && sandboxPurchases !== "false") {
    throw new Error("EXPO_PUBLIC_BILLING_GOOGLE_SANDBOX_PURCHASES must be true or false")
  }

  return {
    APP_ENV: appEnv as AppEnv,
    API_URL: input.EXPO_PUBLIC_API_URL!.trim(),
    GOOGLE_PLACES_ANDROID_API_KEY: input.EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY!.trim(),
    GOOGLE_PLACES_IOS_API_KEY: input.EXPO_PUBLIC_GOOGLE_PLACES_IOS_API_KEY!.trim(),
    GOOGLE_PLACES_WEB_API_KEY: input.EXPO_PUBLIC_GOOGLE_PLACES_WEB_API_KEY!.trim(),
    GOOGLE_PLACES_ANDROID_SHA1: normalizedSha1,
    ONESIGNAL_APP_ID: input.EXPO_PUBLIC_ONESIGNAL_APP_ID!.trim(),
    REVENUECAT_APPLE_API_KEY: revenueCatAppleApiKey,
    REVENUECAT_GOOGLE_API_KEY: revenueCatGoogleApiKey,
    BILLING_GOOGLE_SANDBOX_PURCHASES: sandboxPurchases === "true",
    CLOUDINARY_CLOUD_NAME: input.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!.trim(),
    CLOUDINARY_UPLOAD_PRESET: input.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!.trim(),
  } as const
}

export type Env = ReturnType<typeof parseEnv>
