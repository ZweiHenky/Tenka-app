import type { PartidoResponse } from "../api/jornadas"
import {
  groupScheduleByLocalDate,
  renderSchedulePdf,
  sanitizePdfFilenamePart,
  scheduleMatchHour,
} from "@/shared/utils/schedule-pdf"

interface JornadaPdfMetadata {
  leagueName: string
  divisionName: string
  categoryName: string
  jornadaNumero: number
}

export function programacionJornadaHtml(metadata: JornadaPdfMetadata, partidos: PartidoResponse[]): string {
  const groups = groupScheduleByLocalDate(partidos, (partido) => partido.fecha)

  return renderSchedulePdf({
    kicker: metadata.leagueName,
    title: `Jornada ${metadata.jornadaNumero}`,
    metadata: [metadata.divisionName, metadata.categoryName],
    columns: [
      { label: "Hora", width: "14%" },
      { label: "Cancha", width: "22%" },
      { label: "Local", width: "32%" },
      { label: "Visitante", width: "32%" },
    ],
    groups: groups.map((group) => ({
      label: group.label,
      rows: group.items.map((partido) => [
        { value: scheduleMatchHour(partido.fecha) },
        { value: partido.cancha?.nombre || "Por definir" },
        { value: partido.equipoLocal?.nombre || "Por definir", className: "team" },
        { value: partido.equipoVisitante?.nombre || "Por definir", className: "team" },
      ]),
    })),
  })
}

export function programacionJornadaFilename(metadata: Pick<JornadaPdfMetadata, "leagueName" | "divisionName" | "jornadaNumero">): string {
  const league = sanitizePdfFilenamePart(metadata.leagueName, "liga")
  const division = sanitizePdfFilenamePart(metadata.divisionName, "division")
  return `${league}-${division}-Jornada-${metadata.jornadaNumero}.pdf`
}
