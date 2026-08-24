import { describe, expect, it } from "vitest"
import type { CourtConflict } from "@/features/court-availability/planner"
import { addSlotFailureMessage, CONFLICT_REMEDY, SCHEDULE_REMEDY, summarizeCourtConflicts } from "./court-conflicts"

const conflict = (overrides: Partial<CourtConflict> = {}): CourtConflict => ({
  slotId: "slot-0",
  canchaId: "c1",
  blockerIds: ["booked"],
  reason: "OVERLAP",
  ...overrides,
})

describe("summarizeCourtConflicts", () => {
  it("no dice nada cuando no hay conflictos", () => {
    expect(summarizeCourtConflicts([])).toBeNull()
  })

  it("nombra la cancha ocupada en un OVERLAP", () => {
    const summary = summarizeCourtConflicts([conflict()], new Map([["c1", "Cancha Norte"]]))
    expect(summary?.detail).toContain('"Cancha Norte"')
    expect(summary?.title).toBe("1 horario en conflicto con otra división")
  })

  it("cae al id cuando la cancha no está en el mapa de nombres", () => {
    expect(summarizeCourtConflicts([conflict()])?.detail).toContain('"c1"')
  })

  it("junta varias canchas ocupadas sin repetirlas", () => {
    const summary = summarizeCourtConflicts(
      [conflict(), conflict({ slotId: "slot-1" }), conflict({ slotId: "slot-2", canchaId: "c2" })],
      new Map([["c1", "Norte"], ["c2", "Sur"]]),
    )
    expect(summary?.count).toBe(3)
    expect(summary?.detail).toBe('Las canchas "Norte", "Sur" ya están ocupadas a esa hora por otras divisiones.')
  })

  it("explica NO_CAPACITY como que ninguna cancha configurada está libre", () => {
    const summary = summarizeCourtConflicts([conflict({ canchaId: null, reason: "NO_CAPACITY" })])
    expect(summary?.detail).toBe("Ninguna cancha configurada para esta división está libre a esa hora.")
  })

  it("cubre el OVERLAP sin cancha de las ligas de cancha única", () => {
    const summary = summarizeCourtConflicts([conflict({ canchaId: null })])
    expect(summary?.detail).toBe("Otra división ya tiene reservada esa cancha a esa hora.")
  })

  it("siempre ofrece las dos salidas, porque los slots no se pueden borrar", () => {
    const summary = summarizeCourtConflicts([conflict()])
    expect(summary?.remedy).toBe(CONFLICT_REMEDY)
    expect(CONFLICT_REMEDY).toContain("horarios")
    expect(CONFLICT_REMEDY).toContain("cancha")
  })
})

describe("addSlotFailureMessage", () => {
  it("nombra a las otras divisiones, que es lo que la pantalla no muestra", () => {
    const message = addSlotFailureMessage("CANCHAS_OCUPADAS")
    expect(message).toContain("otras divisiones")
    expect(message).toContain(SCHEDULE_REMEDY)
  })

  it("distingue la semana llena de las canchas ocupadas", () => {
    expect(addSlotFailureMessage("SEMANA_LLENA")).not.toBe(addSlotFailureMessage("CANCHAS_OCUPADAS"))
    expect(addSlotFailureMessage("SEMANA_LLENA")).toContain(SCHEDULE_REMEDY)
  })

  it("no ofrece ampliar el horario cuando no hay horario que ampliar", () => {
    expect(addSlotFailureMessage("SIN_CONFIGURACION")).not.toContain(SCHEDULE_REMEDY)
  })

  it("explica el bloqueo de eliminatorias", () => {
    expect(addSlotFailureMessage("NO_PERMITIDO")).toContain("eliminatorias")
  })

  it("tiene un texto de reserva para un motivo ausente", () => {
    expect(addSlotFailureMessage(null)).toContain(SCHEDULE_REMEDY)
  })
})

describe("CONFLICT_REMEDY", () => {
  it("reusa la misma salida accionable", () => {
    expect(CONFLICT_REMEDY.endsWith(SCHEDULE_REMEDY)).toBe(true)
  })
})
