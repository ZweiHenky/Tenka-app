import { create } from "axios"
import { authClient } from "@/infrastructure/auth/client"
import { env } from "@/infrastructure/config/env"
import { enrichRateLimitError } from "@/infrastructure/api/rate-limit"
import { redactUrlQuery } from "@/infrastructure/api/url-redaction"

interface TransportMetadata {
  requestId: string
  startedAt: number
}

declare module "axios" {
  interface InternalAxiosRequestConfig {
    transportMetadata?: TransportMetadata
  }
}

function requestId(): string {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function safeNativeError(request: any): string | undefined {
  const raw = String(request?.responseText || request?._response || "").trim()
  return /^(stream was reset|unexpected end of stream|connection reset|software caused connection abort|unable to resolve host|ssl|timeout)/i.test(raw)
    ? raw.slice(0, 300)
    : undefined
}

async function logTransportError(error: any) {
  const config = error?.config
  const request = error?.request
  const native = typeof navigator !== "undefined" && navigator.product === "ReactNative"
  let networkState: unknown
  if (native) {
    try {
      const Network = await import("expo-network")
      const state = await Network.getNetworkStateAsync()
      networkState = { type: state.type, isConnected: state.isConnected, isInternetReachable: state.isInternetReachable }
    } catch {
      networkState = undefined
    }
  }
  const diagnostic = {
    event: "api.transport_error",
    requestId: config?.transportMetadata?.requestId,
    method: config?.method?.toUpperCase(),
    path: String(config?.url ?? "").split("?")[0],
    durationMs: config?.transportMetadata ? Date.now() - config.transportMetadata.startedAt : undefined,
    code: error?.code,
    message: error?.message,
    hasResponse: !!error?.response,
    xhr: request ? {
      status: request.status,
      readyState: request.readyState,
      responseURL: redactUrlQuery(request.responseURL),
      requestId: request.getResponseHeader?.("x-request-id") ?? undefined,
      nativeError: safeNativeError(request),
    } : undefined,
    networkState,
  }
  error.transportDiagnostic = diagnostic
  console.warn("[API transport]", diagnostic)
}

function createClient({ withSession }: { withSession: boolean }) {
  const instance = create({
    baseURL: env.API_URL,
    headers: { "Content-Type": "application/json" },
  })

  instance.interceptors.request.use((config) => {
    const id = requestId()
    config.transportMetadata = { requestId: id, startedAt: Date.now() }
    config.headers.set("X-Request-ID", id)
    if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
      config.headers.set("Accept-Encoding", "identity")
      config.withCredentials = false
    }
    if (withSession) {
      const cookies = authClient.getCookie()
      if (cookies) {
        config.headers.Cookie = cookies
      }
    }
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      enrichRateLimitError(error, error.response?.status, error.response?.headers)
      const message = error.response?.data?.error || error.response?.data?.message
      if (message && error.response?.status !== 429) error.message = message
      const code = error.response?.data?.code
      if (typeof code === "string") error.apiCode = code
      if (error.response?.data?.details !== undefined) error.apiDetails = error.response.data.details
      if (!error.response) await logTransportError(error)
      return Promise.reject(error)
    },
  )

  return instance
}

export const api = createClient({ withSession: true })

/**
 * Para endpoints que se autentican con su propio token y deben ser anónimos, como el acceso
 * de árbitro. Manda la cookie de sesión ahí haría que la petición lleve dos identidades a la
 * vez, y el partido podría quedar atribuido a quien tenga la sesión abierta en el teléfono.
 */
export const anonymousApi = createClient({ withSession: false })
