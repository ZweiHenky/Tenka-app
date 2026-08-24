import { describe, expect, it } from "vitest"
import { codigoDeEstado, esSoloLectura, estadoIdPorCodigo } from "../estado-liga"

// Los nombres están cambiados a propósito: es el escenario del bug.
const estados = [
  { id: "e1", nombre: "En preparación", codigo: "BORRADOR" },
  { id: "e2", nombre: "Jugándose", codigo: "EN_CURSO" },
  { id: "e3", nombre: "Cerrada", codigo: "FINALIZADA" },
]

describe("estadoIdPorCodigo", () => {
  it("encuentra la fila por código aunque el nombre esté renombrado", () => {
    expect(estadoIdPorCodigo(estados, "BORRADOR")).toBe("e1")
    expect(estadoIdPorCodigo(estados, "EN_CURSO")).toBe("e2")
  })

  it("devuelve undefined si el catálogo no trae ese código", () => {
    expect(estadoIdPorCodigo(estados, "CANCELADA")).toBeUndefined()
  })

  // Una respuesta vieja sin `codigo` no debe hacer coincidir nada por accidente.
  it("no coincide con filas sin código", () => {
    expect(estadoIdPorCodigo([{ id: "x", nombre: "Borrador" }], "BORRADOR")).toBeUndefined()
  })
})

describe("codigoDeEstado", () => {
  it("resuelve el código de la fila asignada", () => {
    expect(codigoDeEstado(estados, "e3")).toBe("FINALIZADA")
  })

  it("es undefined sin id o con un id ajeno", () => {
    expect(codigoDeEstado(estados, undefined)).toBeUndefined()
    expect(codigoDeEstado(estados, null)).toBeUndefined()
    expect(codigoDeEstado(estados, "ajeno")).toBeUndefined()
  })
})

describe("esSoloLectura", () => {
  it("congela finalizada y cancelada", () => {
    expect(esSoloLectura("FINALIZADA")).toBe(true)
    expect(esSoloLectura("CANCELADA")).toBe(true)
  })

  it("deja escribir el resto, y no bloquea si no sabe", () => {
    for (const codigo of ["BORRADOR", "ABIERTA", "EN_CURSO", undefined, "OTRO"]) {
      expect(esSoloLectura(codigo)).toBe(false)
    }
  })
})
