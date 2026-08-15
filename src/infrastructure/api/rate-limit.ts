type HeadersLike = Headers | Record<string, unknown> | undefined

export type RateLimitError = Error & {
  status?: number
  statusCode?: number
  retryAfterSeconds?: number
  response?: {
    status?: number
    headers?: HeadersLike
  }
}

function headerValue(headers: HeadersLike, name: string): string | undefined {
  if (!headers) return undefined
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined
  }
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())
  const value = entry?.[1]
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined
}

export function parseRetryAfter(value: string | undefined, now = Date.now()): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1, Math.ceil(seconds))
  const date = Date.parse(value)
  if (Number.isNaN(date)) return undefined
  return Math.max(1, Math.ceil((date - now) / 1000))
}

export function rateLimitMessage(retryAfterSeconds?: number): string {
  if (!retryAfterSeconds) return "Demasiadas solicitudes. Intenta de nuevo más tarde."
  if (retryAfterSeconds < 60) {
    return `Demasiadas solicitudes. Intenta de nuevo en ${retryAfterSeconds} segundos.`
  }
  const minutes = Math.ceil(retryAfterSeconds / 60)
  return `Demasiadas solicitudes. Intenta de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`
}

export function enrichRateLimitError(error: unknown, status?: number, headers?: HeadersLike): boolean {
  if (!error || typeof error !== "object") return false
  const target = error as RateLimitError
  const resolvedStatus = status ?? target.response?.status ?? target.status ?? target.statusCode
  if (resolvedStatus !== 429) return false
  const responseHeaders = headers ?? target.response?.headers
  const retryAfterSeconds = parseRetryAfter(
    headerValue(responseHeaders, "retry-after") ?? headerValue(responseHeaders, "x-retry-after"),
  )
  target.status = 429
  target.retryAfterSeconds = retryAfterSeconds
  target.message = rateLimitMessage(retryAfterSeconds)
  return true
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  if (!error || typeof error !== "object") return false
  const target = error as RateLimitError
  return target.response?.status === 429
    || target.status === 429
    || target.statusCode === 429
    || /too many requests|demasiadas solicitudes/i.test(target.message ?? "")
}

export function getRetryAfterSeconds(error: unknown): number | undefined {
  return isRateLimitError(error) ? error.retryAfterSeconds : undefined
}
