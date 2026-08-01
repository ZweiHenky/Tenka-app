import { create } from "axios"
import { authClient } from "@/infrastructure/auth/client"
import { env } from "@/infrastructure/config/env"

export const api = create({
  baseURL: env.API_URL,
  headers: { "Content-Type": "application/json" },
})

let sessionRefresh: Promise<unknown> | null = null

api.interceptors.request.use((config) => {
  const cookies = authClient.getCookie()
  if (cookies) {
    config.headers.Cookie = cookies
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !sessionRefresh) {
      sessionRefresh = authClient
        .getSession({ query: { disableCookieCache: true } })
        .finally(() => { sessionRefresh = null })
    }

    const message = error.response?.data?.error || error.response?.data?.message
    if (message) error.message = message
    return Promise.reject(error)
  },
)
