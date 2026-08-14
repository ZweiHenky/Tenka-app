import { describe, expect, it } from "vitest"

import { parseEnv, type PublicEnvInput } from "./parse-env"

const valid: PublicEnvInput = {
  EXPO_PUBLIC_APP_ENV: "production",
  EXPO_PUBLIC_API_URL: "https://api.example.com",
  EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY: "android-key",
  EXPO_PUBLIC_GOOGLE_PLACES_IOS_API_KEY: "ios-key",
  EXPO_PUBLIC_GOOGLE_PLACES_WEB_API_KEY: "web-key",
  EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1: "00112233445566778899aabbccddeeff00112233",
  EXPO_PUBLIC_ONESIGNAL_APP_ID: "onesignal-id",
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: "cloud-name",
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: "upload-preset",
}

describe("parseEnv", () => {
  it("parses a valid production environment", () => {
    expect(parseEnv(valid)).toMatchObject({ APP_ENV: "production", API_URL: "https://api.example.com" })
  })

  it.each([
    "http://api.example.com",
    "https://localhost:8081",
    "https://127.0.0.1",
    "https://10.0.0.2",
    "https://172.16.0.2",
    "https://192.168.1.2",
    "https://example.ngrok-free.app",
  ])("rejects an unsafe production API URL", (EXPO_PUBLIC_API_URL) => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_API_URL })).toThrow("EXPO_PUBLIC_API_URL")
  })

  it.each(["local", "preview"] as const)("permits ngrok for %s", (EXPO_PUBLIC_APP_ENV) => {
    expect(
      parseEnv({ ...valid, EXPO_PUBLIC_APP_ENV, EXPO_PUBLIC_API_URL: "https://example.ngrok-free.app" }).APP_ENV
    ).toBe(EXPO_PUBLIC_APP_ENV)
  })

  it("names a missing variable without exposing another value", () => {
    const input = { ...valid, EXPO_PUBLIC_ONESIGNAL_APP_ID: "sensitive-value" }
    delete input.EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY

    expect(() => parseEnv(input)).toThrow("EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY is required")
    expect(() => parseEnv(input)).not.toThrow("sensitive-value")
  })

  it("normalizes an Android SHA-1 fingerprint", () => {
    expect(parseEnv(valid).GOOGLE_PLACES_ANDROID_SHA1).toBe("00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33")
  })

  it("rejects an invalid Android SHA-1 fingerprint", () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1: "invalid" })).toThrow("SHA-1 fingerprint")
  })
})
