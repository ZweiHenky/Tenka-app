import { describe, expect, it } from "vitest"
import { getPlayoffFinalizationError } from "../playoff-finalization"

const scheduledPlayoff = {
  tipoPartido: "ELIMINATORIA",
  fecha: "2026-08-02T18:00:00.000Z",
  fechaFin: "2026-08-02T19:00:00.000Z",
  canchaId: "court-1",
}

describe("getPlayoffFinalizationError", () => {
  it("does not restrict regular matches", () => {
    expect(getPlayoffFinalizationError({ tipoPartido: "REGULAR" }, true)).toBeNull()
  })

  it("requires a persisted valid time range for playoffs", () => {
    expect(getPlayoffFinalizationError({ tipoPartido: "ELIMINATORIA", fecha: null, fechaFin: null }, false))
      .toBe("Para asignar resultados, primero genera la jornada.")
    expect(getPlayoffFinalizationError({ ...scheduledPlayoff, fechaFin: scheduledPlayoff.fecha }, false))
      .toBe("Para asignar resultados, primero genera la jornada.")
    expect(getPlayoffFinalizationError({ ...scheduledPlayoff, fechaFin: "invalid" }, false))
      .toBe("Para asignar resultados, primero genera la jornada.")
  })

  it("requires a court for multi-court leagues", () => {
    expect(getPlayoffFinalizationError({ ...scheduledPlayoff, canchaId: null }, true))
      .toContain("asigna una cancha")
  })

  it("does not require a court in single-court mode", () => {
    expect(getPlayoffFinalizationError({ ...scheduledPlayoff, canchaId: null }, false)).toBeNull()
  })
})
