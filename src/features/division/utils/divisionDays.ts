import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"

export type DivisionDaysMode = "" | "weekdays" | "weekend" | "custom"

export const DIVISION_DAY_OPTIONS = [
  { day: 1, token: "L", label: "Lunes" },
  { day: 2, token: "Ma", label: "Martes" },
  { day: 3, token: "Mi", label: "Miércoles" },
  { day: 4, token: "J", label: "Jueves" },
  { day: 5, token: "V", label: "Viernes" },
  { day: 6, token: "S", label: "Sábado" },
  { day: 0, token: "D", label: "Domingo" },
] as const

/**
 * Días en formato corto para mostrar: "L, Ma y J".
 *
 * Pasa por `parseDiasPartido`, así que entiende todo lo que la app llega a guardar
 * ("L-V", "L,Ma,J", "Lunes y Jueves"). Las versiones anteriores mapeaban solo nombres
 * completos y terminaban repitiendo el texto crudo.
 */
export function formatDiasCortos(dias: string | null | undefined): string {
  if (!dias) return "-"
  // Recorre las opciones, no lo parseado: así el orden siempre es de lunes a domingo.
  const parsed = new Set(parseDiasPartido(dias))
  const tokens = DIVISION_DAY_OPTIONS.filter((option) => parsed.has(option.day)).map((option) => option.token)
  if (tokens.length === 0) return dias
  if (tokens.length === 1) return tokens[0]
  return `${tokens.slice(0, -1).join(", ")} y ${tokens[tokens.length - 1]}`
}

function containsExactly(days: number[], expected: number[]): boolean {
  return days.length === expected.length && expected.every((day) => days.includes(day))
}

export function getDivisionDaysMode(value: string): DivisionDaysMode {
  if (!value) return ""
  const days = parseDiasPartido(value)
  if (containsExactly(days, [1, 2, 3, 4, 5])) return "weekdays"
  if (containsExactly(days, [6, 0])) return "weekend"
  return "custom"
}

export function getSelectedDivisionDays(value: string): number[] {
  const selected = new Set(parseDiasPartido(value))
  return DIVISION_DAY_OPTIONS.filter(({ day }) => selected.has(day)).map(({ day }) => day)
}

export function toggleDivisionDay(value: string, day: number): string {
  const selected = new Set(getSelectedDivisionDays(value))
  if (selected.has(day)) selected.delete(day)
  else selected.add(day)

  return DIVISION_DAY_OPTIONS
    .filter((option) => selected.has(option.day))
    .map((option) => option.token)
    .join(",")
}
