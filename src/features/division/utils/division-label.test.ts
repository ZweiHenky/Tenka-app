import { describe, expect, it } from "vitest"
import { divisionLabel } from "./division-label"

describe("divisionLabel", () => {
  it("une nombre y categoría con el separador", () => {
    expect(divisionLabel({ nombre: "Primera Fuerza", categoria: { nombre: "Libre" } })).toBe(
      "Primera Fuerza · Libre",
    )
  })

  /**
   * El caso que motiva el helper: interpolar sin más deja "Primera Fuerza · " colgando cuando el
   * servidor es más viejo y no manda la categoría.
   */
  it("sin categoría devuelve solo el nombre, sin separador colgando", () => {
    expect(divisionLabel({ nombre: "Primera Fuerza" })).toBe("Primera Fuerza")
  })

  it("una categoría con nombre vacío tampoco deja separador", () => {
    expect(divisionLabel({ nombre: "Primera Fuerza", categoria: { nombre: "" } })).toBe(
      "Primera Fuerza",
    )
  })
})
