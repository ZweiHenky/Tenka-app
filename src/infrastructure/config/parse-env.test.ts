import { describe, expect, it } from "vitest"

import { parseEnv, type PublicEnvInput } from "./parse-env"

const valid: PublicEnvInput = {
  EXPO_PUBLIC_APP_ENV: "production",
  EXPO_PUBLIC_API_URL: "https://api.example.com",
  EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: "places-key",
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
    delete input.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY

    expect(() => parseEnv(input)).toThrow("EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is required")
    expect(() => parseEnv(input)).not.toThrow("sensitive-value")
  })
})
