import { describe, expect, it } from "vitest"
import { applyAutomaticCourtAssignments, halfOpenOverlaps, isCourtOccupiedForSlot, planCourtAssignments } from "./planner"

const slot = (id: string, horaInicio: string, horaFin: string, canchaId?: string) => ({
  id,
  fecha: "2026-08-03",
  horaInicio,
  horaFin,
  tipo: "regular" as const,
  canchaId,
})

const occupancy = (id: string, canchaId: string, horaInicio: string, horaFin: string) => ({
  id,
  canchaId,
  fecha: new Date(`2026-08-03T${horaInicio}:00`).toISOString(),
  fechaFin: new Date(`2026-08-03T${horaFin}:00`).toISOString(),
  division: { id: "otra", nombre: "Otra división" },
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

  // Sin restringir las canchas asignables, un slot sin cancha se iba a la menos cargada — que
  // suele ser justo una que la división no tiene configurada, por estar vacía.
  it("never lands an unassigned slot on a court the division does not play on", () => {
    const result = planCourtAssignments({
      mode: "MULTIPLE",
      canchas: [{ id: "a" }, { id: "b" }],
      slots: [slot("one", "18:00", "19:00"), slot("two", "18:00", "19:00")],
      ocupaciones: [],
      assignableCourtIds: ["a"],
    })
    expect(result.slots.map((item) => item.canchaId)).toEqual(["a", undefined])
    expect(result.conflicts).toEqual([expect.objectContaining({ slotId: "two", reason: "NO_CAPACITY" })])
  })

  it("reports NO_CAPACITY instead of spilling onto a free unconfigured court", () => {
    const result = planCourtAssignments({
      mode: "MULTIPLE",
      canchas: [{ id: "a" }, { id: "b" }],
      slots: [slot("draft", "18:00", "19:00")],
      ocupaciones: [occupancy("booked", "a", "18:00", "19:00")],
      assignableCourtIds: ["a"],
    })
    expect(result.slots[0].canchaId).toBeUndefined()
    expect(result.conflicts).toEqual([
      expect.objectContaining({ slotId: "draft", reason: "NO_CAPACITY", blockerIds: ["booked"] }),
    ])
  })

  it("still reports an overlap on a court outside the assignable list", () => {
    const result = planCourtAssignments({
      mode: "MULTIPLE",
      canchas: [{ id: "a" }, { id: "b" }],
      slots: [slot("manual", "18:00", "19:00", "b")],
      ocupaciones: [occupancy("booked", "b", "18:00", "19:00")],
      assignableCourtIds: ["a"],
    })
    expect(result.conflicts).toEqual([
      expect.objectContaining({ slotId: "manual", canchaId: "b", reason: "OVERLAP" }),
    ])
  })

  it("clears a court that is not in the allowed list", () => {
    const slots = [slot("one", "18:00", "19:00", "b")]
    const planned = [slot("one", "18:00", "19:00", "b")]
    expect(applyAutomaticCourtAssignments(slots, planned, ["a"])[0].canchaId).toBeUndefined()
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

describe("isCourtOccupiedForSlot", () => {
  const availability = (mode: "SINGLE" | "MULTIPLE", ocupaciones: any[]) => ({
    ligaId: "l", mode, inicio: "", fin: "", canchas: [{ id: "a", nombre: "A" }],
    ocupaciones, asignaciones: {}, partidosSinCancha: [],
  }) as any

  // En cancha única los partidos se guardan con canchaId null: filtrar por id descartaba todas
  // las reservas y se colocaba encima de otra división.
  it("en SINGLE una ocupación sin cancha bloquea el hueco", () => {
    const reserva = { ...occupancy("otra", "a", "18:00", "19:00"), canchaId: null }

    expect(isCourtOccupiedForSlot(slot("nuevo", "18:00", "19:00"), undefined, availability("SINGLE", [reserva]), []))
      .toBe(true)
  })

  it("en SINGLE deja libre un horario que nadie reservó", () => {
    const reserva = { ...occupancy("otra", "a", "18:00", "19:00"), canchaId: null }

    expect(isCourtOccupiedForSlot(slot("nuevo", "19:00", "20:00"), undefined, availability("SINGLE", [reserva]), []))
      .toBe(false)
  })

  it("en MULTIPLE sigue mirando solo la cancha pedida", () => {
    const enB = occupancy("otra", "b", "18:00", "19:00")

    expect(isCourtOccupiedForSlot(slot("nuevo", "18:00", "19:00", "a"), "a", availability("MULTIPLE", [enB]), []))
      .toBe(false)
    expect(isCourtOccupiedForSlot(slot("nuevo", "18:00", "19:00", "b"), "b", availability("MULTIPLE", [enB]), []))
      .toBe(true)
  })
})
