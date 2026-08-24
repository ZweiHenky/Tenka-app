export function toLocalDateKey(isoDate: string): string {
  const date = new Date(isoDate)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function formatLocalTime(isoDate: string): string {
  const date = new Date(isoDate)
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function toDateKeyInTimeZone(isoDate: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoDate))
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? ""
  return `${value("year")}-${value("month")}-${value("day")}`
}

export function formatTimeInTimeZone(isoDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate))
}

/**
 * Mes y año en español: "marzo de 2026".
 *
 * El palmarés de un equipo lo usa para la fecha en que se coronó. Va a mes y no a día porque ese
 * dato es cuándo se asignó el campeón, no cuándo se jugó la final: casi siempre coinciden, pero
 * mostrar el día exacto fingiría una precisión que el dato no garantiza.
 *
 * Una fecha inválida devuelve cadena vacía en vez de "Invalid Date" en pantalla.
 */
export function formatMonthYear(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
}
