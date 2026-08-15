import type { RefereeMatch } from "./types"
import { toLocalDateKey } from "@/shared/utils/date-time"

export function groupMatchesByDay(matches: RefereeMatch[]): { key: string; matches: RefereeMatch[] }[] {
  const sorted = [...matches].sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999") || a.id.localeCompare(b.id))
  const groups = new Map<string, RefereeMatch[]>()
  sorted.forEach((match) => {
    const key = match.fecha ? toLocalDateKey(match.fecha) : "sin-fecha"
    groups.set(key, [...(groups.get(key) ?? []), match])
  })
  return [...groups].map(([key, dayMatches]) => ({ key, matches: dayMatches }))
}

export function groupMatchesByDivision(matches: RefereeMatch[]) {
  const groups = new Map<string, { id: string; nombre: string; matches: RefereeMatch[] }>()
  matches.forEach((match) => {
    const division = match.jornada?.division ?? match.rondaPlayoff?.division
    const id = division?.id ?? "sin-division"
    const current = groups.get(id) ?? { id, nombre: division?.nombre ?? "Sin división", matches: [] }
    current.matches.push(match)
    groups.set(id, current)
  })
  return [...groups.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre) || a.id.localeCompare(b.id))
    .map((division) => ({ ...division, days: groupMatchesByDay(division.matches) }))
}

export const scheduledMatches = (matches: RefereeMatch[]) => matches.filter((match) => match.fecha && match.fechaFin)

export function allSelectionsLoaded(selectedIds: string[], loadedIds: string[]): boolean {
  const loaded = new Set(loadedIds)
  return selectedIds.every((id) => loaded.has(id))
}

export function assignmentProgress(matches: RefereeMatch[], assignments: Record<string, string[]>) {
  const scheduled = scheduledMatches(matches)
  const assigned = scheduled.filter((match) => (assignments[match.id] ?? []).length > 0).length
  return { assigned, total: scheduled.length, percent: scheduled.length ? Math.round((assigned / scheduled.length) * 100) : 0 }
}
