import axios from "axios"
import { authClient } from "@/infrastructure/auth/client"
import { env } from "@/infrastructure/config/env"

export const api = axios.create({
  baseURL: env.API_URL,
  headers: { "Content-Type": "application/json" },
})

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
    const message = error.response?.data?.error || error.message
    return Promise.reject(new Error(message))
  },
)
