import { describe, expect, it } from "vitest"
import {
  calculateTimeRangeCapacity,
  parseTimeRanges,
  setTimeHour,
  setTimeMinute,
  shiftTimeHour,
  TIME_MINUTES,
  validateTimeRange,
} from "../time-range"

describe("time-range", () => {
  it("offers minute options in ten-minute increments", () => {
    expect(TIME_MINUTES).toEqual(["00", "10", "20", "30", "40", "50"])
  })

  it("changes hour and minute independently", () => {
    expect(setTimeHour("13:20", "15")).toBe("15:20")
    expect(setTimeMinute("13:20", "40")).toBe("13:40")
  })

  it("shifts hours cyclically without changing minutes", () => {
    expect(shiftTimeHour("13:20", 1)).toBe("14:20")
    expect(shiftTimeHour("00:40", -1)).toBe("23:40")
    expect(shiftTimeHour("23:10", 1)).toBe("00:10")
  })

  it("parses and accepts ranges containing minutes", () => {
    const ranges = parseTimeRanges("13:10 - 14:40 / 18:20 - 19:50")

    expect(ranges).toEqual([
      { start: "13:10", end: "14:40" },
      { start: "18:20", end: "19:50" },
    ])
    expect(validateTimeRange("13:10", "14:40", [], -1)).toBeNull()
  })

  it("rejects inverted and overlapping ranges", () => {
    expect(validateTimeRange("14:40", "13:10", [], -1)).toBe("La hora de fin debe ser posterior a la hora de inicio")
    expect(validateTimeRange("14:30", "15:30", [{ start: "13:10", end: "14:40" }], -1)).toBe("Los rangos de horario no deben superponerse")
    expect(validateTimeRange("14:40", "15:30", [{ start: "13:10", end: "14:40" }], -1)).toBeNull()
  })

  it("counts free time only between matches", () => {
    expect(calculateTimeRangeCapacity("14:00", "22:00", 60, 10)).toEqual({
      rangeMinutes: 480,
      matchCount: 7,
      usedMinutes: 480,
      remainingMinutes: 0,
    })
  })

  it("reports allowed time remaining at the end", () => {
    expect(calculateTimeRangeCapacity("14:00", "18:00", 60, 10)).toEqual({
      rangeMinutes: 240,
      matchCount: 3,
      usedMinutes: 200,
      remainingMinutes: 40,
    })
  })

  it("reports when a complete match does not fit", () => {
    expect(calculateTimeRangeCapacity("14:00", "14:50", 60, 10)).toEqual({
      rangeMinutes: 50,
      matchCount: 0,
      usedMinutes: 0,
      remainingMinutes: 50,
    })
  })
})
