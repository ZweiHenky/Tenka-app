export type AppEnv = "local" | "preview" | "production"

export type PublicEnvInput = {
  EXPO_PUBLIC_APP_ENV?: string
  EXPO_PUBLIC_API_URL?: string
  EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?: string
  EXPO_PUBLIC_ONESIGNAL_APP_ID?: string
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?: string
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string
}

const requiredNames = [
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_GOOGLE_PLACES_API_KEY",
  "EXPO_PUBLIC_ONESIGNAL_APP_ID",
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

  return {
    APP_ENV: appEnv as AppEnv,
    API_URL: input.EXPO_PUBLIC_API_URL!.trim(),
    GOOGLE_PLACES_API_KEY: input.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY!.trim(),
    ONESIGNAL_APP_ID: input.EXPO_PUBLIC_ONESIGNAL_APP_ID!.trim(),
    CLOUDINARY_CLOUD_NAME: input.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!.trim(),
    CLOUDINARY_UPLOAD_PRESET: input.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!.trim(),
  } as const
}

export type Env = ReturnType<typeof parseEnv>
