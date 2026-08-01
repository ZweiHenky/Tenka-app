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
    const regular = result.find((slot) => slot.id === "slot-1")
    const friendly = result.find((slot) => slot.id === "extra-1")
    const playoff = result.find((slot) => slot.id === "elim-p1")

    expect(regular?.equipoLocalId).toBe("a")
    expect(regular?.equipoVisitanteId).toBeUndefined()
    expect(friendly?.equipoLocalId).toBe("playoff-a")
    expect(friendly?.equipoVisitanteId).toBe("b")
    expect(playoff?.equipoLocalId).toBe("playoff-a")
    expect(playoff?.equipoVisitanteId).toBe("playoff-b")
  })
})
