export function normalizeJugadorPhone(callingCode: string, input: string): string | null {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, "")
  const code = callingCode.replace(/\D/g, "")

  let internationalDigits: string
  if (trimmed.startsWith("+")) {
    internationalDigits = digits
  } else if (trimmed.startsWith("00")) {
    internationalDigits = digits.slice(2)
  } else if (digits.startsWith(code) && digits.length > 10) {
    internationalDigits = digits
  } else {
    internationalDigits = `${code}${digits}`
  }

  return /^\d{8,15}$/.test(internationalDigits) ? `+${internationalDigits}` : null
}
