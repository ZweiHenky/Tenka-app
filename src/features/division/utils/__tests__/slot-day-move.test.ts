import { describe, expect, it } from "vitest"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { availableTimesForDay, placementForDay, preferredTimeForDay } from "../slot-day-move"

const targetDate = "2026-08-14"
const current: TimeSlotConfig = {
  id: "current",
  fecha: "2026-08-10",
  horaInicio: "17:00",
  horaFin: "17:50",
}

const onCourtA: TimeSlotConfig = { ...current, canchaId: "court-a" }

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

  it("blocks every court when the moving slot has no court", () => {
    const slots = [current, occupied("other", "17:00", "17:50", "court-b")]
    expect(availableTimesForDay(current, targetDate, slots, "17:00 - 18:40", 50, 0)).toEqual([
      { horaInicio: "17:50", horaFin: "18:40" },
    ])
  })

  it("ignores other courts when the moving slot has a court", () => {
    const slots = [onCourtA, occupied("other", "17:00", "17:50", "court-b")]
    expect(availableTimesForDay(onCourtA, targetDate, slots, "17:00 - 18:40", 50, 0)).toEqual([
      { horaInicio: "17:00", horaFin: "17:50" },
      { horaInicio: "17:50", horaFin: "18:40" },
    ])
  })

  it("still blocks the same court", () => {
    const slots = [onCourtA, occupied("other", "17:00", "17:50", "court-a")]
    expect(availableTimesForDay(onCourtA, targetDate, slots, "17:00 - 18:40", 50, 0)).toEqual([
      { horaInicio: "17:50", horaFin: "18:40" },
    ])
  })

  it("keeps the same time when the clash is on another court", () => {
    const slots = [onCourtA, occupied("other", "17:00", "17:50", "court-b")]
    expect(preferredTimeForDay(onCourtA, targetDate, slots, "17:00 - 21:10", 50, 0)).toEqual({
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })

  it("honors the injected blocked predicate", () => {
    expect(
      availableTimesForDay(current, targetDate, [current], "17:00 - 18:40", 50, 0, (t) => t.horaInicio === "17:00"),
    ).toEqual([{ horaInicio: "17:50", horaFin: "18:40" }])
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

// "17:00 - 18:40" with 50min matches yields exactly two times: 17:00-17:50 and 17:50-18:40.
describe("day placement across courts", () => {
  const twoCourts = ["court-a", "court-b"]
  const place = (slot: TimeSlotConfig, slots: TimeSlotConfig[], courtOrder: (string | undefined)[], isBlockedFor?: any) =>
    placementForDay(slot, targetDate, slots, "17:00 - 18:40", 50, 0, courtOrder, isBlockedFor)

  it("stays on its own court even when another court has the same hour free", () => {
    const slots = [onCourtA, occupied("a1", "17:00", "17:50", "court-a")]
    expect(place(onCourtA, slots, twoCourts)).toEqual({ canchaId: "court-a", horaInicio: "17:50", horaFin: "18:40" })
  })

  it("keeps the same hour on its own court when it is free", () => {
    const slots = [onCourtA, occupied("b1", "17:00", "17:50", "court-b")]
    expect(place(onCourtA, slots, twoCourts)).toEqual({ canchaId: "court-a", horaInicio: "17:00", horaFin: "17:50" })
  })

  it("falls back to the next court when its own court is full", () => {
    const slots = [
      onCourtA,
      occupied("a1", "17:00", "17:50", "court-a"),
      occupied("a2", "17:50", "18:40", "court-a"),
    ]
    expect(place(onCourtA, slots, twoCourts)).toEqual({ canchaId: "court-b", horaInicio: "17:00", horaFin: "17:50" })
  })

  it("returns null when every court is full", () => {
    const slots = [
      onCourtA,
      occupied("a1", "17:00", "17:50", "court-a"),
      occupied("a2", "17:50", "18:40", "court-a"),
      occupied("b1", "17:00", "17:50", "court-b"),
      occupied("b2", "17:50", "18:40", "court-b"),
    ]
    expect(place(onCourtA, slots, twoCourts)).toBeNull()
  })

  it("tries its own court first regardless of the given order", () => {
    const slots = [onCourtA, occupied("b1", "17:00", "17:50", "court-b")]
    expect(place(onCourtA, slots, ["court-b", "court-a"])).toEqual({
      canchaId: "court-a",
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })

  it("keeps single-court behavior when no courts are offered", () => {
    expect(place(current, [current], [])).toEqual({ canchaId: undefined, horaInicio: "17:00", horaFin: "17:50" })
  })

  it("still blocks against every court for a court-less slot", () => {
    const slots = [
      current,
      occupied("x1", "17:00", "17:50", "court-b"),
      occupied("x2", "17:50", "18:40", "court-a"),
    ]
    expect(place(current, slots, [])).toBeNull()
  })

  it("uses each court's own time ranges when given a resolver", () => {
    // court-a closes at 17:50, court-b runs later. The slot only fits on court-b.
    const horarioFor = (canchaId?: string) => canchaId === "court-a" ? "17:00 - 17:50" : "17:00 - 18:40"
    const slots = [onCourtA, occupied("a1", "17:00", "17:50", "court-a")]

    expect(placementForDay(onCourtA, targetDate, slots, horarioFor, 50, 0, twoCourts)).toEqual({
      canchaId: "court-b",
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })

  it("no ofrece una cancha en un día que esa cancha no juega", () => {
    // targetDate (2026-08-14) es viernes. court-a está llena; court-b tiene horas libres pero
    // solo juega lunes, así que no debe ofrecerse.
    const slots = [
      onCourtA,
      occupied("a1", "17:00", "17:50", "court-a"),
      occupied("a2", "17:50", "18:40", "court-a"),
    ]
    const diasFor = (canchaId?: string) => canchaId === "court-b" ? "lun" : "vie"

    expect(placementForDay(onCourtA, targetDate, slots, "17:00 - 18:40", 50, 0, twoCourts, undefined, diasFor))
      .toBeNull()
  })

  it("applies the blocked predicate per court", () => {
    const slots = [onCourtA]
    const isBlockedFor = (canchaId: string | undefined) =>
      canchaId === "court-a" ? () => true : undefined
    expect(place(onCourtA, slots, twoCourts, isBlockedFor)).toEqual({
      canchaId: "court-b",
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })
})
