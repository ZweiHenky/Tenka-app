import { describe, expect, it } from "vitest"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { availableTimesForDay, preferredTimeForDay } from "../slot-day-move"

const targetDate = "2026-08-14"
const current: TimeSlotConfig = {
  id: "current",
  fecha: "2026-08-10",
  horaInicio: "17:00",
  horaFin: "17:50",
}

function occupied(id: string, horaInicio: string, horaFin: string, canchaId?: string): TimeSlotConfig {
  return { id, fecha: targetDate, horaInicio, horaFin, canchaId }
}

describe("slot day movement", () => {
  it("keeps the same time when it is available", () => {
    expect(preferredTimeForDay(current, targetDate, [current], "17:00 - 21:10", 50, 0)).toEqual({
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })

  it("uses the next available time when the same time is occupied", () => {
    const slots = [current, occupied("other", "17:00", "17:50")]
    expect(preferredTimeForDay(current, targetDate, slots, "17:00 - 21:10", 50, 0)).toEqual({
      horaInicio: "17:50",
      horaFin: "18:40",
    })
  })

  it("treats another court as globally occupied", () => {
    const slots = [current, occupied("other", "17:00", "17:50", "court-b")]
    expect(availableTimesForDay(current, targetDate, slots, "17:00 - 18:40", 50, 0)).toEqual([
      { horaInicio: "17:50", horaFin: "18:40" },
    ])
  })

  it("wraps to the first free time when no later time remains", () => {
    const lateSlot = { ...current, horaInicio: "20:20", horaFin: "21:10" }
    const slots = [lateSlot, occupied("late", "20:20", "21:10")]
    expect(preferredTimeForDay(lateSlot, targetDate, slots, "17:00 - 21:10", 50, 0)).toEqual({
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })

  it("returns null when the selected day is full", () => {
    const times = ["17:00", "17:50", "18:40", "19:30", "20:20"]
    const ends = ["17:50", "18:40", "19:30", "20:20", "21:10"]
    const slots = [current, ...times.map((start, index) => occupied(`occupied-${index}`, start, ends[index]))]
    expect(preferredTimeForDay(current, targetDate, slots, "17:00 - 21:10", 50, 0)).toBeNull()
  })
})
