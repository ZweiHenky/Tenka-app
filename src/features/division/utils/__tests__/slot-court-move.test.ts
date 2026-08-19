import { describe, expect, it } from "vitest"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { timeForCourt } from "../slot-court-move"

// "17:00 - 18:40" with 50min matches yields exactly two times: 17:00-17:50 and 17:50-18:40.
const HORARIO = "17:00 - 18:40"
const fecha = "2026-08-14"

// The slot being moved sits on the late time of court-a.
const slot: TimeSlotConfig = { id: "current", fecha, horaInicio: "17:50", horaFin: "18:40", canchaId: "court-a" }

function occupied(id: string, horaInicio: string, horaFin: string, canchaId: string, onFecha = fecha): TimeSlotConfig {
  return { id, fecha: onFecha, horaInicio, horaFin, canchaId }
}

const move = (
  slots: TimeSlotConfig[],
  isBlocked?: (time: { horaInicio: string; horaFin: string }) => boolean,
  options?: { candidateDates?: string[]; diasPartido?: string | ((canchaId?: string) => string) },
) => timeForCourt(slot, "court-b", slots, HORARIO, 50, 0, isBlocked ? () => isBlocked : undefined, options)

describe("moving a slot to another court", () => {
  it("keeps its current time when that time is free on the target court", () => {
    expect(move([slot])).toEqual({ fecha, horaInicio: "17:50", horaFin: "18:40" })
  })

  it("takes the earliest free time when its current time is taken", () => {
    expect(move([slot, occupied("b1", "17:50", "18:40", "court-b")])).toEqual({
      fecha,
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })

  it("returns null when the target court is full that day", () => {
    const slots = [slot, occupied("b1", "17:00", "17:50", "court-b"), occupied("b2", "17:50", "18:40", "court-b")]
    expect(move(slots)).toBeNull()
  })

  it("ignores slots on other courts", () => {
    expect(move([slot, occupied("c1", "17:50", "18:40", "court-c")])).toEqual({
      fecha,
      horaInicio: "17:50",
      horaFin: "18:40",
    })
  })

  it("ignores slots on other days", () => {
    expect(move([slot, occupied("b1", "17:50", "18:40", "court-b", "2026-08-15")])).toEqual({
      fecha,
      horaInicio: "17:50",
      horaFin: "18:40",
    })
  })

  it("honors the injected blocked predicate", () => {
    expect(move([slot], (time) => time.horaInicio === "17:50")).toEqual({
      fecha,
      horaInicio: "17:00",
      horaFin: "17:50",
    })
  })

  describe("buscando en otros días", () => {
    // 2026-08-14 is a Friday, 2026-08-15 a Saturday.
    const otroDia = "2026-08-15"
    const fullThatDay = [
      slot,
      occupied("b1", "17:00", "17:50", "court-b"),
      occupied("b2", "17:50", "18:40", "court-b"),
    ]

    it("cae al primer día con hueco cuando ese día está lleno", () => {
      expect(move(fullThatDay, undefined, { candidateDates: [fecha, otroDia] })).toEqual({
        fecha: otroDia,
        horaInicio: "17:00",
        horaFin: "17:50",
      })
    })

    it("prefiere su propio día aunque haya otros días libres", () => {
      expect(move([slot], undefined, { candidateDates: [fecha, otroDia] })).toEqual({
        fecha,
        horaInicio: "17:50",
        horaFin: "18:40",
      })
    })

    it("devuelve null cuando está llena en todos los días candidatos", () => {
      const slots = [
        ...fullThatDay,
        occupied("b3", "17:00", "17:50", "court-b", otroDia),
        occupied("b4", "17:50", "18:40", "court-b", otroDia),
      ]
      expect(move(slots, undefined, { candidateDates: [fecha, otroDia] })).toBeNull()
    })

    it("sin candidateDates mantiene el comportamiento de un solo día", () => {
      expect(move(fullThatDay)).toBeNull()
    })

    it("no coloca en un día que esa cancha no juega", () => {
      // court-b solo juega viernes, así que el sábado no es candidato válido.
      expect(move(fullThatDay, undefined, { candidateDates: [fecha, otroDia], diasPartido: "vie" })).toBeNull()
    })
  })
})
