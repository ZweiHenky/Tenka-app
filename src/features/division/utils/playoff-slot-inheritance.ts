import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import type { PlayoffSlotCandidate } from "@/stores/divisionSchedule"
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
