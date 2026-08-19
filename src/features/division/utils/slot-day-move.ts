import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { generateTimeSlots, timeToMinutes, type GeneratedTimeSlot } from "@/shared/utils/time-range"
import { isTimeOccupied } from "@/shared/utils/time-occupancy"
import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"

/**
 * The division's time ranges. A plain string means "the same everywhere"; a function resolves
 * the ranges of one court, which is what a per-court schedule needs.
 */
export type HorarioSource = string | ((canchaId?: string) => string)

/** Días de juego de una cancha, en el mismo formato que `diasPartido`. */
export type DiasSource = string | ((canchaId?: string) => string)

export function resolveHorario(source: HorarioSource, canchaId: string | undefined): string {
  return typeof source === "function" ? source(canchaId) : source
}

function dayOfWeek(fecha: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const [y, m, d] = fecha.split("-").map(Number)
  const parsed = new Date(y, m - 1, d)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getDay()
}

/** Whether the court plays that date. Unknown/empty configuration means "no restriction". */
export function courtPlaysOn(dias: DiasSource | undefined, canchaId: string | undefined, fecha: string): boolean {
  if (dias === undefined) return true
  const configured = parseDiasPartido(typeof dias === "function" ? dias(canchaId) : dias)
  if (configured.length === 0) return true
  const day = dayOfWeek(fecha)
  return day === null || configured.includes(day)
}

export function availableTimesForDay(
  slot: TimeSlotConfig,
  targetDate: string,
  slots: TimeSlotConfig[],
  horarioPartido: HorarioSource,
  duracionPartido: number,
  descanso: number,
  isBlocked?: (time: GeneratedTimeSlot) => boolean,
  diasPartido?: DiasSource,
): GeneratedTimeSlot[] {
  // A court that does not play that day has no times at all, whatever its hours say.
  // Checking it here covers preferredTimeForDay, placementForDay and timeForCourt at once.
  if (!courtPlaysOn(diasPartido, slot.canchaId, targetDate)) return []
  // The grid comes from the slot's own court, so probing `{ ...slot, canchaId }` is enough
  // for callers that walk several courts.
  return generateTimeSlots(resolveHorario(horarioPartido, slot.canchaId), duracionPartido, descanso)
    .filter((time) => !isTimeOccupied(time, slot.id, slots, targetDate, slot.canchaId)
      && !isBlocked?.(time))
}

export function preferredTimeForDay(
  slot: TimeSlotConfig,
  targetDate: string,
  slots: TimeSlotConfig[],
  horarioPartido: HorarioSource,
  duracionPartido: number,
  descanso: number,
  isBlocked?: (time: GeneratedTimeSlot) => boolean,
  diasPartido?: DiasSource,
): GeneratedTimeSlot | null {
  const available = availableTimesForDay(slot, targetDate, slots, horarioPartido, duracionPartido, descanso, isBlocked, diasPartido)
  const sameTime = available.find((time) => time.horaInicio === slot.horaInicio && time.horaFin === slot.horaFin)
  if (sameTime) return sameTime

  const currentStart = timeToMinutes(slot.horaInicio)
  return available.find((time) => timeToMinutes(time.horaInicio) > currentStart) ?? available[0] ?? null
}

export interface DayPlacement {
  canchaId?: string
  horaInicio: string
  horaFin: string
}

/**
 * Best spot for a slot on `targetDate`, trying its own court first and only then
 * the rest of `courtOrder`. Returns null when no court has room that day.
 * An empty `courtOrder` probes the own court only (single-court and fixed-court divisions).
 */
export function placementForDay(
  slot: TimeSlotConfig,
  targetDate: string,
  slots: TimeSlotConfig[],
  horarioPartido: HorarioSource,
  duracionPartido: number,
  descanso: number,
  courtOrder: (string | undefined)[] = [],
  isBlockedFor?: (canchaId: string | undefined) => ((time: GeneratedTimeSlot) => boolean) | undefined,
  diasPartido?: DiasSource,
): DayPlacement | null {
  const seen = new Set<string>()
  for (const canchaId of [slot.canchaId, ...courtOrder]) {
    const key = canchaId ?? "__own__"
    if (seen.has(key)) continue
    seen.add(key)
    const time = preferredTimeForDay(
      { ...slot, canchaId },
      targetDate,
      slots,
      horarioPartido,
      duracionPartido,
      descanso,
      isBlockedFor?.(canchaId),
      diasPartido,
    )
    if (time) return { canchaId, horaInicio: time.horaInicio, horaFin: time.horaFin }
  }
  return null
}
