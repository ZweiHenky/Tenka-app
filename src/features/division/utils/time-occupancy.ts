import type { TimeSlotConfig } from "@/stores/divisionSchedule"

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

export function isTimeOccupied(
  time: { horaInicio: string; horaFin: string },
  currentSlotId: string,
  slots: TimeSlotConfig[],
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
