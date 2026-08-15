import { describe, expect, it } from "vitest"
import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import { inheritedPlayoffCandidates, isSchedulablePlayoffMatch } from "../playoff-slot-inheritance"

describe("playoff slot inheritance", () => {
  it("inherits weekday, time and court from the previous round in chronological order", () => {
    const rounds = [{
      id: "semifinal",
      nombre: "Semifinal",
      orden: 1,
      divisionId: "division",
      createdAt: "",
      updatedAt: "",
      partidos: [
        { id: "second", fecha: "2026-07-23T17:00:00.000Z", fechaFin: "2026-07-23T18:00:00.000Z", timeZone: "America/Mexico_City", canchaId: "court-2", llave: 2 },
        { id: "first", fecha: "2026-07-21T16:00:00.000Z", fechaFin: "2026-07-21T17:00:00.000Z", timeZone: "America/Mexico_City", canchaId: "court-1", llave: 1 },
      ],
    }, {
      id: "final",
      nombre: "Final",
      orden: 2,
      divisionId: "division",
      createdAt: "",
      updatedAt: "",
      partidos: [],
    }] as RondaPlayoff[]

    expect(inheritedPlayoffCandidates(rounds, 2, "2026-07-27")).toEqual([
      { fecha: "2026-07-28", horaInicio: "10:00", horaFin: "11:00", canchaId: "court-1" },
      { fecha: "2026-07-30", horaInicio: "11:00", horaFin: "12:00", canchaId: "court-2" },
    ])
  })

  it("excludes finalized and already scheduled matches", () => {
    expect(isSchedulablePlayoffMatch({ estado: "PROGRAMADO", jornadaId: null })).toBe(true)
    expect(isSchedulablePlayoffMatch({ estado: "PROGRAMADO", jornadaId: "jornada-1" })).toBe(false)
    expect(isSchedulablePlayoffMatch({ estado: "FINALIZADO", jornadaId: null })).toBe(false)
  })
})
