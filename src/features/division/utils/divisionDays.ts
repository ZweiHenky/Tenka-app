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
