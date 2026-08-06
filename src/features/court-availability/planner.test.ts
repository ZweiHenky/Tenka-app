import { describe, expect, it } from "vitest"
import { applyAutomaticCourtAssignments, halfOpenOverlaps, planCourtAssignments } from "./planner"

const slot = (id: string, horaInicio: string, horaFin: string, canchaId?: string) => ({
  id,
  fecha: "2026-08-03",
  horaInicio,
  horaFin,
  tipo: "regular" as const,
  canchaId,
})

describe("court assignment planner", () => {
  it("uses half-open intervals", () => {
    expect(halfOpenOverlaps({ start: 1, end: 2 }, { start: 2, end: 3 })).toBe(false)
    expect(halfOpenOverlaps({ start: 1, end: 3 }, { start: 2, end: 4 })).toBe(true)
  })

  it("reports virtual-court conflicts in single mode", () => {
    const result = planCourtAssignments({
      mode: "SINGLE",
      canchas: [],
      slots: [slot("a", "18:00", "19:00"), slot("b", "18:30", "19:30")],
      ocupaciones: [],
    })
    expect(result.conflicts).toEqual([expect.objectContaining({ slotId: "b", reason: "NO_CAPACITY" })])
    expect(result.slots.every((item) => item.canchaId === undefined)).toBe(true)
  })

  it("assigns simultaneous drafts to least-loaded courts deterministically", () => {
    const result = planCourtAssignments({
      mode: "MULTIPLE",
      canchas: [{ id: "b" }, { id: "a" }],
      slots: [slot("one", "18:00", "19:00"), slot("two", "18:00", "19:00")],
      ocupaciones: [],
    })
    expect(result.slots.map((item) => item.canchaId)).toEqual(["a", "b"])
    expect(result.conflicts).toEqual([])
  })

  it("preserves a conflicting manual court without moving time", () => {
    const original = slot("manual", "18:00", "19:00", "a")
    const result = planCourtAssignments({
      mode: "MULTIPLE",
      canchas: [{ id: "a" }, { id: "b" }],
      slots: [original],
      ocupaciones: [{ id: "saved", fecha: new Date("2026-08-03T18:30:00").toISOString(), fechaFin: new Date("2026-08-03T19:30:00").toISOString(), canchaId: "a", division: { id: "other", nombre: "Otra" } }],
    })
    expect(result.slots[0]).toMatchObject(original)
    expect(result.conflicts[0]).toMatchObject({ slotId: "manual", canchaId: "a", reason: "OVERLAP" })
  })

  it("applies an independent automatic assignment while retaining a conflicting manual court", () => {
    const manual = slot("manual", "18:00", "19:00", "a")
    const automatic = slot("automatic", "18:00", "19:00")
    const result = planCourtAssignments({
      mode: "MULTIPLE",
      canchas: [{ id: "a" }, { id: "b" }],
      slots: [manual, automatic],
      ocupaciones: [{ id: "saved", fecha: new Date("2026-08-03T18:00:00").toISOString(), fechaFin: new Date("2026-08-03T19:00:00").toISOString(), canchaId: "a", division: { id: "other", nombre: "Otra" } }],
    })

    const merged = applyAutomaticCourtAssignments([manual, automatic], result.slots, ["a", "b"])
    expect(result.conflicts).toEqual([expect.objectContaining({ slotId: "manual", reason: "OVERLAP" })])
    expect(merged.find((item) => item.id === "manual")).toMatchObject({ canchaId: "a", horaInicio: "18:00", horaFin: "19:00" })
    expect(merged.find((item) => item.id === "automatic")).toMatchObject({ canchaId: "b", horaInicio: "18:00", horaFin: "19:00" })
  })
})
