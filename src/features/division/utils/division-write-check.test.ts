import { describe, expect, it } from "vitest"
import type { Division } from "@/domain/interfaces/league"
import { divisionWriteCommitted } from "./division-write-check"

const division = (extra: Partial<Division> = {}): Division => ({
  id: "div-1",
  nombre: "Primera",
  maxEquipos: 20,
  arbitraje: 300,
  diasPartido: "sab",
  horarioPartido: "08:00 - 20:00",
  duracionPartido: 60,
  descanso: 0,
  fechaInicio: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ligaId: "liga-1",
  estadoLigaId: "estado-1",
  categoriaId: "cat-1",
  tipoId: "tipo-1",
  tipoCompetenciaId: "tc-1",
  registrarParticipaciones: false,
  registrarGoleo: true,
  usarPenalesEnEmpates: true,
  minPartidosEliminatoria: 0,
  ...extra,
})

describe("divisionWriteCommitted", () => {
  /**
   * El campo que faltaba en la lista: se agregó al payload y no a la comparación, así que un
   * guardado suyo con la respuesta perdida se daba por confirmado sin comprobar nada.
   */
  it("minPartidosEliminatoria: coincide, se guardó", () => {
    expect(divisionWriteCommitted({ minPartidosEliminatoria: 3 }, division({ minPartidosEliminatoria: 3 }))).toBe(true)
  })

  it("minPartidosEliminatoria: no coincide, no se guardó", () => {
    expect(divisionWriteCommitted({ minPartidosEliminatoria: 3 }, division({ minPartidosEliminatoria: 0 }))).toBe(false)
  })

  /** Bajar a 0 —quitar el requisito— tiene que distinguirse de "no lo mandé". */
  it("minPartidosEliminatoria en 0 se compara, no se ignora", () => {
    expect(divisionWriteCommitted({ minPartidosEliminatoria: 0 }, division({ minPartidosEliminatoria: 5 }))).toBe(false)
    expect(divisionWriteCommitted({ minPartidosEliminatoria: 0 }, division({ minPartidosEliminatoria: 0 }))).toBe(true)
  })

  it("los campos que no se enviaron no opinan", () => {
    expect(divisionWriteCommitted({}, division({ registrarGoleo: false, minPartidosEliminatoria: 9 }))).toBe(true)
  })

  it("los interruptores que ya estaban siguen comparándose", () => {
    expect(divisionWriteCommitted({ registrarGoleo: false }, division({ registrarGoleo: false }))).toBe(true)
    expect(divisionWriteCommitted({ registrarGoleo: false }, division({ registrarGoleo: true }))).toBe(false)
  })

  /** La fecha vuelve como instante ISO, por eso se compara por prefijo. */
  it("la fecha coincide por prefijo", () => {
    expect(divisionWriteCommitted({ fechaInicio: "2026-09-05" }, division({ fechaInicio: "2026-09-05T06:00:00.000Z" }))).toBe(true)
    expect(divisionWriteCommitted({ fechaInicio: "2026-09-05" }, division({ fechaInicio: "2026-09-12T06:00:00.000Z" }))).toBe(false)
  })

  /** Un arreglo con `===` siempre diría "distinto"; se compara en forma canónica. */
  it("los horarios por cancha se comparan sin importar el orden", () => {
    const enviado = [
      { canchaId: "b", diasPartido: "dom", horarioPartido: "10:00 - 14:00" },
      { canchaId: "a", diasPartido: "sab", horarioPartido: "08:00 - 12:00" },
    ]
    const guardado = [
      { canchaId: "a", diasPartido: "sab", horarioPartido: "08:00 - 12:00" },
      { canchaId: "b", diasPartido: "dom", horarioPartido: "10:00 - 14:00" },
    ]
    expect(divisionWriteCommitted({ horariosPorCancha: enviado }, division({ canchaHorarios: guardado }))).toBe(true)
    expect(divisionWriteCommitted({ horariosPorCancha: enviado }, division({ canchaHorarios: [] }))).toBe(false)
  })
})
