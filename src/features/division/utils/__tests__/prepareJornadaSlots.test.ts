import { describe, expect, it } from "vitest"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { prepareJornadaSlots } from "../prepareJornadaSlots"

describe("prepareJornadaSlots", () => {
  it("clears disabled teams from regular slots", () => {
    const slots: TimeSlotConfig[] = [
      { id: "slot-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "regular", equipoLocalId: "a", equipoVisitanteId: "disabled" },
    ]

    const result = prepareJornadaSlots(slots, ["a", "b"], false)

    expect(result[0].equipoLocalId).toBe("a")
    expect(result[0].equipoVisitanteId).toBeUndefined()
  })

  it("preserves playoff teams in eliminatorias and, intentionally, in manual friendlies", () => {
    const slots: TimeSlotConfig[] = [
      { id: "slot-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "regular", equipoLocalId: "a", equipoVisitanteId: "playoff-a" },
      { id: "extra-1", fecha: "2026-07-27", horaInicio: "09:00", horaFin: "10:00", tipo: "amistoso", equipoLocalId: "playoff-a", equipoVisitanteId: "b" },
      { id: "elim-p1", fecha: "2026-07-27", horaInicio: "10:00", horaFin: "11:00", tipo: "eliminatoria", partidoId: "p1", equipoLocalId: "playoff-a", equipoVisitanteId: "playoff-b" },
    ]

    const result = prepareJornadaSlots(slots, ["a", "b", "playoff-a", "playoff-b"], true)
    const regular = result[0]
    const friendly = result[1]
    const playoff = result[2]

    expect(regular?.equipoLocalId).toBe("a")
    expect(regular?.equipoVisitanteId).toBeUndefined()
    expect(regular?.tipo).toBe("amistoso")
    expect(friendly?.equipoLocalId).toBe("playoff-a")
    expect(friendly?.equipoVisitanteId).toBe("b")
    expect(playoff?.equipoLocalId).toBe("playoff-a")
    expect(playoff?.equipoVisitanteId).toBe("playoff-b")
  })

  it("serializes every non-playoff slot as friendly while playoff mode is active", () => {
    const result = prepareJornadaSlots([
      { id: "slot-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "regular" },
      { id: "slot-2", fecha: "2026-07-27", horaInicio: "09:00", horaFin: "10:00", tipo: "complemento" },
    ], ["a", "b", "c", "d"], true)

    expect(result.map((slot) => slot.tipo)).toEqual(["amistoso", "amistoso"])
  })

  it("serializes only jornada DTO fields including canchaId", () => {
    const result = prepareJornadaSlots([{
      id: "local-only",
      fecha: "2026-08-03",
      horaInicio: "18:00",
      horaFin: "19:00",
      tipo: "regular",
      canchaId: "court-a",
      rondaNombre: "must not leak",
      llave: 3,
    }], ["a", "b"], false)

    expect(result[0]).toEqual({
      fecha: "2026-08-03",
      horaInicio: "18:00",
      horaFin: "19:00",
      equipoLocalId: undefined,
      equipoVisitanteId: undefined,
      tipo: "regular",
      canchaId: "court-a",
      partidoId: undefined,
    })
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0]).not.toHaveProperty("rondaNombre")
  })
})
