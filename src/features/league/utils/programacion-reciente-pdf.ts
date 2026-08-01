import type { ProgramacionRecienteLigaDto, ProgramacionRecientePartidoDto } from "../api/leagues"
import {
  groupScheduleByLocalDate,
  renderSchedulePdf,
  sanitizePdfFilenamePart,
  scheduleMatchHour,
} from "@/shared/utils/schedule-pdf"

export interface ProgramacionPdfMatch {
  partido: ProgramacionRecientePartidoDto
  jornadaNumero: number
  divisionNombre: string
  categoriaNombre: string
}

export function groupProgramacionByLocalDate(partidos: ProgramacionPdfMatch[]) {
  return groupScheduleByLocalDate(partidos, ({ partido }) => partido.fecha).map((group) => ({
    ...group,
    partidos: group.items,
  }))
}

function recentMatches(data: ProgramacionRecienteLigaDto): ProgramacionPdfMatch[] {
  return data.divisiones.flatMap((division) => {
    const jornada = division.jornadas[0]
    if (!jornada) return []
    return jornada.partidos.map((partido) => ({
      partido,
      jornadaNumero: jornada.numero,
      divisionNombre: division.nombre,
      categoriaNombre: division.categoria.nombre,
    }))
  })
}

export function hasProgramacionReciente(data: ProgramacionRecienteLigaDto): boolean {
  return data.divisiones.some((division) => (division.jornadas[0]?.partidos.length ?? 0) > 0)
}

export function programacionRecienteHtml(data: ProgramacionRecienteLigaDto): string {
  const groups = groupProgramacionByLocalDate(recentMatches(data))
  return renderSchedulePdf({
    kicker: "Programación reciente",
    title: data.nombre,
    columns: [
      { label: "Hora", width: "9%" },
      { label: "Jornada", width: "9%" },
      { label: "División", width: "14%" },
      { label: "Categoría", width: "14%" },
      { label: "Cancha", width: "14%" },
      { label: "Local", width: "20%" },
      { label: "Visitante", width: "20%" },
    ],
    groups: groups.map((group) => ({
      label: group.label,
      rows: group.partidos.map(({ partido, jornadaNumero, divisionNombre, categoriaNombre }) => [
        { value: scheduleMatchHour(partido.fecha) },
        { value: jornadaNumero },
        { value: divisionNombre },
        { value: categoriaNombre },
        { value: partido.cancha?.nombre || "Por definir" },
        { value: partido.equipoLocal?.nombre || "Por definir", className: "team" },
        { value: partido.equipoVisitante?.nombre || "Por definir", className: "team" },
      ]),
    })),
  })
}

export function programacionRecienteFilename(leagueName: string): string {
  return `Programacion-reciente-${sanitizePdfFilenamePart(leagueName, "liga")}.pdf`
}
