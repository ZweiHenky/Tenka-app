import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import { phoneNumberClient } from "better-auth/client/plugins"
import * as SecureStore from "expo-secure-store"
import { env } from "@/infrastructure/config/env"
import { captureAuthRateLimit } from "@/infrastructure/auth/rate-limit"

export const authClient = createAuthClient({
  baseURL: env.API_URL,
  sessionOptions: {
    refetchInterval: 0,
    refetchOnWindowFocus: false,
  },
  fetchOptions: {
    onError: ({ error, response }) => {
      captureAuthRateLimit(error, response.status, response.headers)
    },
  },
  plugins: [
    expoClient({
      scheme: "tenka",
      storagePrefix: "tenka",
      storage: SecureStore,
    }),
    phoneNumberClient(),
  ],
})
