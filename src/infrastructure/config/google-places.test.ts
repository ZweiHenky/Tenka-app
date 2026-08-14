import { describe, expect, it } from "vitest"
import { parseEnv } from "./parse-env"
import { resolveGooglePlacesConfig } from "./google-places"

const env = parseEnv({
  EXPO_PUBLIC_APP_ENV: "local",
  EXPO_PUBLIC_API_URL: "http://localhost:3000",
  EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY: "android-key",
  EXPO_PUBLIC_GOOGLE_PLACES_IOS_API_KEY: "ios-key",
  EXPO_PUBLIC_GOOGLE_PLACES_WEB_API_KEY: "web-key",
  EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1: "00112233445566778899aabbccddeeff00112233",
  EXPO_PUBLIC_ONESIGNAL_APP_ID: "onesignal-id",
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: "cloud-name",
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: "upload-preset",
})

describe("resolveGooglePlacesConfig", () => {
  it("uses Android key and application headers", () => {
    expect(resolveGooglePlacesConfig("android", env)).toMatchObject({
      apiKey: "android-key",
      headers: {
        "X-Android-Package": "studio.tenka.app",
        "X-Android-Cert": "00112233445566778899AABBCCDDEEFF00112233",
      },
    })
  })

  it("uses iOS key and bundle header", () => {
    expect(resolveGooglePlacesConfig("ios", env)).toMatchObject({
      apiKey: "ios-key",
      headers: { "X-Ios-Bundle-Identifier": "studio.tenka.app" },
    })
  })

  it("uses the referrer-restricted web key without native headers", () => {
    expect(resolveGooglePlacesConfig("web", env)).toEqual({
      apiKey: "web-key",
      headers: undefined,
      autocompleteUrl: undefined,
      detailsUrl: undefined,
    })
  })
})
