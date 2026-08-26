export interface ApiErrorMetadata {
  code?: string
  details?: unknown
}

export type ApiError = Error & { apiCode?: string; apiDetails?: unknown }

export function getApiErrorMetadata(error: unknown): ApiErrorMetadata {
  if (!error || typeof error !== "object") return {}
  const candidate = error as ApiError & { response?: { data?: { code?: unknown; details?: unknown } } }
  const responseData = candidate.response?.data
  return {
    code: typeof candidate.apiCode === "string"
      ? candidate.apiCode
      : typeof responseData?.code === "string" ? responseData.code : undefined,
    details: candidate.apiDetails ?? responseData?.details,
  }
}

export function hasApiErrorCode(error: unknown, ...codes: readonly string[]): boolean {
  const code = getApiErrorMetadata(error).code
  return !!code && codes.includes(code)
}
