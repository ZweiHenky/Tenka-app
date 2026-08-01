type AuthErrorLike = {
  code?: string
  message?: string
  statusText?: string
}

const AUTH_MESSAGES: Record<string, string> = {
  INVALID_OTP: "El código de verificación es incorrecto.",
  OTP_EXPIRED: "El código expiró. Solicita uno nuevo.",
  TOO_MANY_ATTEMPTS: "Demasiados intentos. Inténtalo más tarde.",
  INVALID_PHONE_NUMBER: "El número de teléfono no es válido.",
  PHONE_NUMBER_EXIST: "Este número ya está vinculado a otra cuenta.",
  POPUP_CLOSED: "Se cerró el inicio de sesión antes de completarse.",
  ACCESS_DENIED: "Google no autorizó el inicio de sesión.",
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback

  const authError = error as AuthErrorLike
  if (authError.code && AUTH_MESSAGES[authError.code]) return AUTH_MESSAGES[authError.code]

  const message = authError.message || authError.statusText
  if (!message) return fallback
  if (/cancel|closed|dismiss/i.test(message)) return "Se canceló el inicio de sesión."
  if (/network|fetch/i.test(message)) return "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo."
  return message
}
