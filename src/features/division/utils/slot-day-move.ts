import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { generateTimeSlots, timeToMinutes, type GeneratedTimeSlot } from "@/shared/utils/time-range"

function overlaps(left: GeneratedTimeSlot, right: Pick<TimeSlotConfig, "horaInicio" | "horaFin">): boolean {
  return timeToMinutes(left.horaInicio) < timeToMinutes(right.horaFin)
    && timeToMinutes(left.horaFin) > timeToMinutes(right.horaInicio)
}

export function availableTimesForDay(
  slot: TimeSlotConfig,
  targetDate: string,
  slots: TimeSlotConfig[],
  horarioPartido: string,
  duracionPartido: number,
  descanso: number,
): GeneratedTimeSlot[] {
  const occupied = slots.filter((candidate) => candidate.id !== slot.id && candidate.fecha === targetDate)
  return generateTimeSlots(horarioPartido, duracionPartido, descanso)
    .filter((time) => !occupied.some((candidate) => overlaps(time, candidate)))
}

export function preferredTimeForDay(
  slot: TimeSlotConfig,
  targetDate: string,
  slots: TimeSlotConfig[],
  horarioPartido: string,
  duracionPartido: number,
  descanso: number,
): GeneratedTimeSlot | null {
  const available = availableTimesForDay(slot, targetDate, slots, horarioPartido, duracionPartido, descanso)
  const sameTime = available.find((time) => time.horaInicio === slot.horaInicio && time.horaFin === slot.horaFin)
  if (sameTime) return sameTime

  const currentStart = timeToMinutes(slot.horaInicio)
  return available.find((time) => timeToMinutes(time.horaInicio) > currentStart) ?? available[0] ?? null
}
