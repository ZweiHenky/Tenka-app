import type { Env } from "./parse-env"

export type GooglePlacesPlatform = "android" | "ios" | "web"

const ANDROID_PACKAGE = "studio.tenka.app"
const IOS_BUNDLE_IDENTIFIER = "studio.tenka.app"
const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
const DETAILS_URL = "https://places.googleapis.com/v1/places"

interface GooglePlacesConfig {
  apiKey: string
  headers: Record<string, string> | undefined
  autocompleteUrl: string | undefined
  detailsUrl: string | undefined
}

export function resolveGooglePlacesConfig(platform: GooglePlacesPlatform, env: Env): GooglePlacesConfig {
  if (platform === "android") {
    return {
      apiKey: env.GOOGLE_PLACES_ANDROID_API_KEY,
      headers: {
        "X-Android-Package": ANDROID_PACKAGE,
        "X-Android-Cert": env.GOOGLE_PLACES_ANDROID_SHA1.replace(/:/g, ""),
      },
      autocompleteUrl: AUTOCOMPLETE_URL,
      detailsUrl: DETAILS_URL,
    }
  }

  if (platform === "ios") {
    return {
      apiKey: env.GOOGLE_PLACES_IOS_API_KEY,
      headers: { "X-Ios-Bundle-Identifier": IOS_BUNDLE_IDENTIFIER },
      autocompleteUrl: AUTOCOMPLETE_URL,
      detailsUrl: DETAILS_URL,
    }
  }

  return {
    apiKey: env.GOOGLE_PLACES_WEB_API_KEY,
    headers: undefined,
    autocompleteUrl: undefined,
    detailsUrl: undefined,
  }
}
