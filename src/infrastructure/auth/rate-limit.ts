import { enrichRateLimitError, isRateLimitError, rateLimitMessage, type RateLimitError } from "@/infrastructure/api/rate-limit"

let latestRateLimit: { retryAfterSeconds?: number; capturedAt: number } | null = null

export function captureAuthRateLimit(error: unknown, status: number, headers: Headers): void {
  if (!enrichRateLimitError(error, status, headers)) return
  latestRateLimit = {
    retryAfterSeconds: (error as RateLimitError).retryAfterSeconds,
    capturedAt: Date.now(),
  }
}

export function applyCapturedAuthRateLimit(error: unknown): void {
  if (!isRateLimitError(error)) return
  const target = error as RateLimitError
  const captured = latestRateLimit && Date.now() - latestRateLimit.capturedAt < 10_000 ? latestRateLimit : null
  target.status = 429
  target.retryAfterSeconds = captured?.retryAfterSeconds
  target.message = rateLimitMessage(target.retryAfterSeconds)
}
