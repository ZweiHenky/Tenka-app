import { describe, expect, it } from "vitest"
import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import { bracketCandidates, inheritedPlayoffCandidates, isSchedulablePlayoffMatch } from "../playoff-slot-inheritance"

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

describe("bracketCandidates", () => {
  const dosCanchas = new Map([
    ["c1", { diasPartido: "L", horarioPartido: "18:00 - 20:00" }],
    ["c2", { diasPartido: "L", horarioPartido: "18:00 - 20:00" }],
  ])
  // 2026-07-20 es lunes.
  const LUNES = "2026-07-20"

  // La clave de deduplicación sin cancha forzaba una ronda de 4 a cuatro horarios distintos.
  it("ofrece el mismo horario en las dos canchas", () => {
    const enLunes = bracketCandidates(dosCanchas, "L", "18:00 - 20:00", 60, 0, LUNES, ["c1", "c2"])
      .filter((candidato) => candidato.fecha === LUNES && candidato.horaInicio === "18:00")

    expect(enLunes.map((candidato) => candidato.canchaId).sort()).toEqual(["c1", "c2"])
  })

  it("respeta los días y el rango de cada cancha, no la unión", () => {
    const distintas = new Map([
      ["c1", { diasPartido: "L", horarioPartido: "18:00 - 19:00" }],
      ["c2", { diasPartido: "M", horarioPartido: "20:00 - 21:00" }],
    ])

    const candidatos = bracketCandidates(distintas, "L,M", "18:00 - 21:00", 60, 0, LUNES, ["c1", "c2"])
      .filter((candidato) => candidato.fecha === LUNES || candidato.fecha === "2026-07-21")

    expect(candidatos).toEqual([
      { fecha: "2026-07-20", horaInicio: "18:00", horaFin: "19:00", canchaId: "c1" },
      { fecha: "2026-07-21", horaInicio: "20:00", horaFin: "21:00", canchaId: "c2" },
    ])
  })

  it("sin configuración por cancha se comporta como antes", () => {
    const candidatos = bracketCandidates(undefined, "L", "18:00 - 20:00", 60, 0, LUNES, [])

    expect(candidatos[0]).toEqual({ fecha: "2026-07-20", horaInicio: "18:00", horaFin: "19:00", canchaId: undefined })
  })

  it("cubre varias semanas en orden cronológico", () => {
    const fechas = bracketCandidates(undefined, "L", "18:00 - 19:00", 60, 0, LUNES, []).map((c) => c.fecha)

    expect(fechas.length).toBeGreaterThan(4)
    expect(fechas[0]).toBe("2026-07-20")
    expect(fechas[1]).toBe("2026-07-27")
    expect([...fechas].sort()).toEqual(fechas)
  })
})
