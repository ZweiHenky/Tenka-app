import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import { buildSlotCandidates, type CourtScheduleConfig, type PlayoffSlotCandidate } from "@/stores/divisionSchedule"
import { formatTimeInTimeZone, toDateKeyInTimeZone } from "@/shared/utils/date-time"

export function isSchedulablePlayoffMatch(match: { estado: string | null; jornadaId: string | null }): boolean {
  return match.estado !== "FINALIZADO" && !match.jornadaId
}

function localDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function inheritedPlayoffCandidates(
  rounds: RondaPlayoff[],
  targetRoundOrder: number,
  targetWeekReference: string,
): PlayoffSlotCandidate[] {
  const previousRound = rounds.find((round) => round.orden === targetRoundOrder - 1)
  if (!previousRound) return []

  const monday = localDate(targetWeekReference)
  const mondayDay = monday.getDay()
  monday.setDate(monday.getDate() + (mondayDay === 0 ? -6 : 1 - mondayDay))

  return previousRound.partidos
    .filter((partido) => !!partido.fecha && !!partido.fechaFin && !!partido.timeZone)
    .sort((left, right) => new Date(left.fecha!).getTime() - new Date(right.fecha!).getTime() || (left.llave ?? 0) - (right.llave ?? 0))
    .map((partido) => {
      const previousDate = localDate(toDateKeyInTimeZone(partido.fecha!, partido.timeZone!))
      const dayOffset = previousDate.getDay() === 0 ? 6 : previousDate.getDay() - 1
      const nextDate = new Date(monday)
      nextDate.setDate(monday.getDate() + dayOffset)
      return {
        fecha: dateKey(nextDate),
        horaInicio: formatTimeInTimeZone(partido.fecha!, partido.timeZone!),
        horaFin: formatTimeInTimeZone(partido.fechaFin!, partido.timeZone!),
        canchaId: partido.canchaId ?? undefined,
      }
    })
}

/** Semanas hacia adelante que se ofrecen para colocar un partido del cuadro (~2 meses). */
const SEMANAS_DE_HORIZONTE = 9

/**
 * Huecos donde puede caer un partido del cuadro, en orden cronológico y **con la cancha que los
 * ofrece**.
 *
 * Reusa `buildSlotCandidates`, la misma grilla que usan la generación de slots, el relleno de
 * `initSchedule` y `addSlot`: cada cancha aporta sus propios días y su propio rango. Antes esto
 * se armaba con el resumen (la unión) de todas las canchas y sin `canchaId`, así que un partido
 * podía quedar en una hora que su cancha no juega.
 *
 * `buildSlotCandidates` cubre una semana, así que se la llama para varias y se concatena; cada
 * semana ya sale ordenada por (fecha, hora, cancha), y las semanas van en orden.
 */
export function bracketCandidates(
  courtSchedules: Map<string, CourtScheduleConfig> | undefined,
  diasPartido: string,
  horarioPartido: string,
  duracion: number,
  descanso: number,
  refDate: string,
  courtIds: string[] = [],
): PlayoffSlotCandidate[] {
  const primerLunes = localDate(refDate)
  const dia = primerLunes.getDay()
  primerLunes.setDate(primerLunes.getDate() + (dia === 0 ? -6 : 1 - dia))

  const candidatos: PlayoffSlotCandidate[] = []
  for (let semana = 0; semana < SEMANAS_DE_HORIZONTE; semana += 1) {
    const lunes = new Date(primerLunes)
    lunes.setDate(lunes.getDate() + semana * 7)
    for (const candidato of buildSlotCandidates(courtSchedules, diasPartido, horarioPartido, duracion, descanso, lunes, courtIds)) {
      candidatos.push({
        fecha: candidato.fecha,
        horaInicio: candidato.horaInicio,
        horaFin: candidato.horaFin,
        canchaId: candidato.canchaId,
      })
    }
  }
  return candidatos
}
