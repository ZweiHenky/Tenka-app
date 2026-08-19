import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import type { GeneratedTimeSlot } from "@/shared/utils/time-range"
import { availableTimesForDay, type DiasSource, type HorarioSource } from "./slot-day-move"

export interface CourtPlacement {
  fecha: string
  horaInicio: string
  horaFin: string
}

/**
 * Where a slot lands on `targetCourtId`.
 *
 * Its own day comes first: the slot keeps its time when that time is free there, otherwise the
 * earliest free time of that day. Only if the court has no room that day are `candidateDates`
 * walked in order, taking the first day with space at its earliest free time — so changing court
 * still works when the whole day is booked on every court.
 *
 * Returns null when the court has no room on any candidate day.
 */
export function timeForCourt(
  slot: TimeSlotConfig,
  targetCourtId: string,
  slots: TimeSlotConfig[],
  horarioPartido: HorarioSource,
  duracionPartido: number,
  descanso: number,
  isBlockedFor?: (fecha: string) => ((time: GeneratedTimeSlot) => boolean) | undefined,
  options?: { candidateDates?: string[]; diasPartido?: DiasSource },
): CourtPlacement | null {
  const probe = { ...slot, canchaId: targetCourtId }
  const timesOn = (fecha: string) => availableTimesForDay(
    probe, fecha, slots, horarioPartido, duracionPartido, descanso, isBlockedFor?.(fecha), options?.diasPartido,
  )

  const sameDay = timesOn(slot.fecha)
  const sameTime = sameDay.find((time) => time.horaInicio === slot.horaInicio && time.horaFin === slot.horaFin)
  if (sameTime) return { fecha: slot.fecha, ...sameTime }
  if (sameDay[0]) return { fecha: slot.fecha, ...sameDay[0] }

  for (const fecha of options?.candidateDates ?? []) {
    if (fecha === slot.fecha) continue
    const earliest = timesOn(fecha)[0]
    if (earliest) return { fecha, ...earliest }
  }
  return null
}
