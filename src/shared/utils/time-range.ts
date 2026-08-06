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

export const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"))
export const TIME_MINUTES = ["00", "10", "20", "30", "40", "50"]

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + (minutes || 0)
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
