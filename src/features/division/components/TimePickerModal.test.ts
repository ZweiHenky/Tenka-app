import { describe, expect, it } from "vitest"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { isTimeOccupied } from "@/shared/utils/time-occupancy"

const time = { horaInicio: "14:00", horaFin: "15:00" }

function slot(id: string, canchaId?: string): TimeSlotConfig {
  return { id, fecha: "2026-08-13", ...time, canchaId }
}

describe("isTimeOccupied", () => {
  it("keeps a time available when only another court is occupied", () => {
    expect(isTimeOccupied(time, "current", [slot("current", "court-b"), slot("other", "court-a")], "2026-08-13", "court-b")).toBe(false)
  })

  it("marks a time occupied when the same court overlaps", () => {
    expect(isTimeOccupied(time, "current", [slot("current", "court-b"), slot("other", "court-b")], "2026-08-13", "court-b")).toBe(true)
  })

  it("preserves single-court occupancy checks", () => {
    expect(isTimeOccupied(time, "current", [slot("current"), slot("other")], "2026-08-13")).toBe(true)
  })
})
