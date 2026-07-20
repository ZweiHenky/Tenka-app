import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import * as SecureStore from "expo-secure-store"
import { env } from "@/infrastructure/config/env"

export const authClient = createAuthClient({
  baseURL: env.API_URL,
  plugins: [
    expoClient({
      scheme: "tenka",
      storagePrefix: "tenka",
      storage: SecureStore,
    }),
  ],
})
