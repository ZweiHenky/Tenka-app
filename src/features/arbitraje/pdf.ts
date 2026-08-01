import type { LeagueReferee, RefereeBatchDetail, RefereeCandidateDivision } from "./types"
import { groupMatchesByDay, scheduledMatches } from "./utils"
import { formatLocalTime } from "@/shared/utils/date-time"

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!)

export function refereeBatchHtml(batch: RefereeBatchDetail): string {
  const rows = groupMatchesByDay(batch.partidos).flatMap(({ key, matches }) => matches.map((match) => {
    const division = match.jornada?.division.nombre ?? match.rondaPlayoff?.division.nombre ?? "Sin división"
    const time = match.fecha ? formatLocalTime(match.fecha) : "Sin hora"
    return `<tr><td>${escapeHtml(key === "sin-fecha" ? "Sin fecha" : new Date(`${key}T12:00:00`).toLocaleDateString("es-MX"))}</td><td>${escapeHtml(time)}</td><td>${escapeHtml(division)}</td><td>${escapeHtml(match.arbitros.map((r) => r.nombre).join(", ") || "Sin asignar")}</td></tr>`
  })).join("")
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:7px;text-align:left}th{background:#17202a;color:white}</style></head><body><h1>${escapeHtml(batch.nombre)}</h1><table><thead><tr><th>Fecha</th><th>Hora</th><th>División</th><th>Árbitros</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
}

export function refereeAssignmentsHtml(divisions: RefereeCandidateDivision[], assignments: Record<string, string[]>, referees: LeagueReferee[]): string {
  const refereeNames = new Map(referees.map((referee) => [referee.id, referee.nombre]))
  const rows = divisions.flatMap((division) => {
    const matches = scheduledMatches([...division.jornadas, ...division.rondasPlayoff].flatMap((group) => group.partidos))
    return groupMatchesByDay(matches).flatMap(({ key, matches: dayMatches }) => dayMatches.map((match) => {
      const time = `${formatLocalTime(match.fecha ?? "")} - ${formatLocalTime(match.fechaFin ?? "")}`
      const names = (assignments[match.id] ?? []).map((id) => refereeNames.get(id)).filter((name): name is string => !!name).join(", ")
      return `<tr><td>${escapeHtml(division.nombre)}</td><td>${escapeHtml(new Date(`${key}T12:00:00`).toLocaleDateString("es-MX"))}</td><td>${escapeHtml(time)}</td><td>${escapeHtml(names || "Sin asignar")}</td></tr>`
    }))
  }).join("")
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:7px;text-align:left}th{background:#17202a;color:white}</style></head><body><h1>Asignaciones de árbitros</h1><table><thead><tr><th>División</th><th>Fecha</th><th>Horario</th><th>Árbitros</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
}
