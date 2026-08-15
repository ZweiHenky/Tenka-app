export interface TimeRange {
  start: string
  end: string
}

export interface TimeRangeCapacity {
  rangeMinutes: number
  matchCount: number
  usedMinutes: number
  remainingMinutes: number
}

export interface GeneratedTimeSlot {
  horaInicio: string
  horaFin: string
}

export const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"))
export const TIME_MINUTES = ["00", "10", "20", "30", "40", "50"]

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

export function parseTimeRanges(value: string): TimeRange[] {
  if (!value) return []
  return value.split(" / ").map((range) => {
    let parts = range.split(" - ").map((part) => part.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    parts = range.split("-").map((part) => part.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    return null
  }).filter(Boolean) as TimeRange[]
}

export function generateTimeSlots(value: string, matchDuration: number, breakDuration: number): GeneratedTimeSlot[] {
  if (!Number.isFinite(matchDuration) || matchDuration <= 0) return []
  const slotStep = matchDuration + Math.max(0, breakDuration)
  const slots: GeneratedTimeSlot[] = []

  for (const range of parseTimeRanges(value)) {
    let current = timeToMinutes(range.start)
    const rangeEnd = timeToMinutes(range.end)
    while (current < rangeEnd && current + matchDuration <= rangeEnd) {
      slots.push({
        horaInicio: minutesToTime(current),
        horaFin: minutesToTime(current + matchDuration),
      })
      current += slotStep
    }
  }
  return slots
}

export function isTimeSlotWithinRanges(value: string, horaInicio: string, horaFin: string): boolean {
  const slotStart = timeToMinutes(horaInicio)
  const slotEnd = timeToMinutes(horaFin)
  if (!Number.isFinite(slotStart) || !Number.isFinite(slotEnd) || slotEnd <= slotStart) return false

  return parseTimeRanges(value).some((range) => {
    const rangeStart = timeToMinutes(range.start)
    const rangeEnd = timeToMinutes(range.end)
    return slotStart >= rangeStart && slotStart < rangeEnd && slotEnd <= rangeEnd
  })
}

export function setTimeHour(value: string, hour: string): string {
  const minute = value.split(":")[1] ?? "00"
  return `${hour}:${minute}`
}

export function shiftTimeHour(value: string, amount: number): string {
  const currentHour = Number(value.split(":")[0])
  const hour = Number.isInteger(currentHour) ? (currentHour + amount + 24) % 24 : 0
  return setTimeHour(value, String(hour).padStart(2, "0"))
}

export function setTimeMinute(value: string, minute: string): string {
  const hour = value.split(":")[0] ?? "00"
  return `${hour}:${minute}`
}

export function calculateTimeRangeCapacity(
  start: string,
  end: string,
  matchDuration: number,
  breakDuration: number,
): TimeRangeCapacity {
  const rangeMinutes = Math.max(0, timeToMinutes(end) - timeToMinutes(start))
  const safeBreakDuration = Math.max(0, breakDuration)
  if (matchDuration <= 0 || rangeMinutes < matchDuration) {
    return { rangeMinutes, matchCount: 0, usedMinutes: 0, remainingMinutes: rangeMinutes }
  }

  const matchCount = Math.floor((rangeMinutes + safeBreakDuration) / (matchDuration + safeBreakDuration))
  const usedMinutes = matchCount * matchDuration + Math.max(0, matchCount - 1) * safeBreakDuration
  return {
    rangeMinutes,
    matchCount,
    usedMinutes,
    remainingMinutes: rangeMinutes - usedMinutes,
  }
}

export function validateTimeRange(start: string, end: string, ranges: TimeRange[], index: number): string | null {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  if (endMinutes <= startMinutes) return "La hora de fin debe ser posterior a la hora de inicio"

  for (let currentIndex = 0; currentIndex < ranges.length; currentIndex++) {
    if (currentIndex === index) continue
    const currentStart = timeToMinutes(ranges[currentIndex].start)
    const currentEnd = timeToMinutes(ranges[currentIndex].end)
    if (startMinutes < currentEnd && endMinutes > currentStart) {
      return "Los rangos de horario no deben superponerse"
    }
  }

  return null
}
