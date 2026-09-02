import { describe, expect, it } from "vitest"
import { equiposAbsorbidosPorComplementos, equiposDisponiblesParaRegulares, exigeEquipoQueDescansa } from "./descanso"

const regular = (id: string, local?: string, visitante?: string) => ({ id, equipoLocalId: local, equipoVisitanteId: visitante })
const complemento = (id: string, puntos: string, sinPuntos: string) => ({ id, tipo: "complemento", equipoLocalId: puntos, equipoVisitanteId: sinPuntos })

const habilitados = (n: number) => Array.from({ length: n }, (_, i) => `e${i}`)

describe("equiposAbsorbidosPorComplementos", () => {
  /** El servidor reserva al equipo de puntos si está libre, y por eso absorbe al sobrante. */
  it("cuenta al equipo de puntos cuando no juega en ningún otro slot", () => {
    expect(equiposAbsorbidosPorComplementos([regular("s1"), complemento("s2", "e0", "e1")])).toEqual(["e0"])
  })

  /** Si ya juega, está repitiendo a propósito: no deja de estar disponible para los regulares. */
  it("no cuenta al equipo de puntos si ya juega en otro slot", () => {
    expect(equiposAbsorbidosPorComplementos([regular("s1", "e0", "e5"), complemento("s2", "e0", "e1")])).toEqual([])
  })

  it("el lado sin puntos nunca cuenta: repite por definición", () => {
    expect(equiposAbsorbidosPorComplementos([complemento("s1", "e0", "e1")])).not.toContain("e1")
  })

  it("varios complementos absorben varios equipos, sin repetir", () => {
    const slots = [complemento("s1", "e0", "e9"), complemento("s2", "e1", "e9"), complemento("s3", "e0", "e8")]
    expect(equiposAbsorbidosPorComplementos(slots).sort()).toEqual(["e0", "e1"])
  })

  /**
   * Lo único que libera al equipo de puntos es tener un regular: son los únicos slots que el
   * servidor procesa antes y que alimentan `usedTeamIds`. Un amistoso no reserva a nadie.
   */
  it("estar en un amistoso no libera al equipo de puntos", () => {
    const slots = [{ id: "s1", tipo: "amistoso", equipoLocalId: "e0", equipoVisitanteId: "e5" }, complemento("s2", "e0", "e1")]
    expect(equiposAbsorbidosPorComplementos(slots)).toEqual(["e0"])
  })
})

describe("equiposDisponiblesParaRegulares", () => {
  it("mantiene todos los regulares cuando los habilitados son pares", () => {
    expect(equiposDisponiblesParaRegulares(habilitados(8), [complemento("s1", "e0", "e1")])).toBe(8)
    expect(equiposDisponiblesParaRegulares(habilitados(8), [])).toBe(8)
  })

  it("absorbe como máximo el descanso natural de una jornada impar", () => {
    const slots = [complemento("s1", "e0", "e5"), complemento("s2", "e1", "e6")]
    expect(equiposDisponiblesParaRegulares(habilitados(7), slots)).toBe(6)
  })
})

describe("exigeEquipoQueDescansa", () => {
  it("con habilitados impares y sin complementos, sí", () => {
    expect(exigeEquipoQueDescansa(habilitados(7), [])).toBe(true)
  })

  /** El caso de siempre: el complemento absorbe al sobrante y nadie descansa. */
  it("un complemento con el equipo de puntos libre absorbe al sobrante", () => {
    expect(exigeEquipoQueDescansa(habilitados(7), [complemento("s1", "e0", "e1")])).toBe(false)
  })

  /** Lo nuevo: si el equipo de puntos repite, no absorbe a nadie y el sobrante sigue ahí. */
  it("un complemento cuyo equipo de puntos ya juega no absorbe nada", () => {
    const slots = [regular("s1", "e0", "e5"), complemento("s2", "e0", "e1")]
    expect(exigeEquipoQueDescansa(habilitados(7), slots)).toBe(true)
  })

  it("habilitados pares con complemento conservan sus regulares y no exigen descanso", () => {
    expect(exigeEquipoQueDescansa(habilitados(20), [complemento("s1", "e0", "e1")])).toBe(false)
  })

  it("con menos de tres equipos no se pide nada", () => {
    expect(exigeEquipoQueDescansa(habilitados(2), [])).toBe(false)
    expect(exigeEquipoQueDescansa(undefined, [])).toBe(false)
  })
})
