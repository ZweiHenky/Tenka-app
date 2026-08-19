import { timeToMinutes } from "./time-range"

/** Structural shape of a schedule slot — keeps this util free of store/feature imports. */
export interface OccupiableSlot {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  canchaId?: string
}

/**
 * Whether `time` collides with an existing slot on `fecha`.
 * When `currentCanchaId` is undefined the probe is court-blind and every slot blocks,
 * which is what keeps single-court divisions behaving as before.
 */
export function isTimeOccupied(
  time: { horaInicio: string; horaFin: string },
  currentSlotId: string,
  slots: OccupiableSlot[],
  fecha: string,
  currentCanchaId?: string,
): boolean {
  const start = timeToMinutes(time.horaInicio)
  const end = timeToMinutes(time.horaFin)
  return slots.some((slot) => {
    if (slot.id === currentSlotId || slot.fecha !== fecha) return false
    if (currentCanchaId && slot.canchaId !== currentCanchaId) return false
    if (!slot.horaInicio || !slot.horaFin) return false
    const slotStart = timeToMinutes(slot.horaInicio)
    const slotEnd = timeToMinutes(slot.horaFin)
    return start < slotEnd && end > slotStart
  })
}
