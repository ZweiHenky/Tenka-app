import { describe, expect, it, vi } from "vitest"

// Como en el resto de los tests: importar la paleta de verdad arrastra la cadena de nativewind y
// vitest se cae intentando resolver PostCSS.
vi.mock("@/constants/theme", () => ({
  Palette: { cyan: "cyan", cyan10: "cyan10", danger: "danger", danger10: "danger10", warning: "warning", warning10: "warning10" },
}))

const { ACTION_HELP, secondaryActions } = await import("./partido-acciones")

const titulos = new Set(ACTION_HELP.map((item) => item.title))

describe("leyenda de acciones del partido", () => {
  /**
   * El olvido que motivó esto: "Corregir resultado" existía como botón desde hacía tiempo y nunca
   * llegó a la hoja de ayuda, así que explicaba cuatro de los cinco.
   */
  it("toda acción secundaria está explicada, en cualquier estado", () => {
    const estados = ["PROGRAMADO", "EN_JUEGO", "FINALIZADO", "SUSPENDIDO", null]
    const sinExplicar = estados
      .flatMap((estado) => secondaryActions(estado))
      .map((accion) => accion.label)
      .filter((label) => !titulos.has(label))

    expect([...new Set(sinExplicar)]).toEqual([])
  })

  /**
   * Los dos botones principales se dibujan en JSX suelto, no salen de una lista, así que no hay de
   * dónde derivarlos: se comprueban por nombre para que quitarlos de la leyenda no pase inadvertido.
   */
  it("los botones principales también están explicados", () => {
    expect(titulos.has("Finalizar partido")).toBe(true)
    expect(titulos.has("Corregir resultado")).toBe(true)
  })

  /** Reabrir borra el resultado pero **no** el partido, y confundirlos es justo lo que asusta. */
  it("Reabrir aclara que el partido sigue en la jornada", () => {
    const reabrir = ACTION_HELP.find((item) => item.title === "Reabrir")!
    expect(reabrir.description).toContain("sigue en su jornada")
    expect(reabrir.description).not.toContain("para poder corregirlo")
  })

  it("cada entrada trae icono, colores y una descripción con contenido", () => {
    for (const item of ACTION_HELP) {
      expect(item.icon).toBeTruthy()
      expect(item.color).toBeTruthy()
      expect(item.background).toBeTruthy()
      expect(item.description.length).toBeGreaterThan(20)
    }
  })
})
