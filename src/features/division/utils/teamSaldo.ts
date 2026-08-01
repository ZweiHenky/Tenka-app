export function normalizeSaldoInput(value: string) {
  return value.trim().replace(/,/g, ".")
}

export function isValidSaldoInput(value: string) {
  return /^\d+(?:\.\d{1,2})?$/.test(normalizeSaldoInput(value))
}

export function formatSaldoPendiente(value?: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return "Sin adeudo"

  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pendiente`
}
