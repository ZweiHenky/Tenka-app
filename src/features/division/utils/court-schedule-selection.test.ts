import { describe, expect, it } from "vitest"
import {
  courtScheduleLines,
  courtSelectorOptions,
  selectedCourtSchedule,
  TODAS_LAS_CANCHAS,
} from "./court-schedule-selection"

const norte = { canchaId: "c1", nombre: "Norte", diasPartido: "S", horarioPartido: "08:00 - 12:00" }
const sur = { canchaId: "c2", nombre: "Sur", diasPartido: "D", horarioPartido: "18:00 - 22:00" }
// La unión de las dos: nadie juega ese rango completo, y por eso existe el selector.
const resumen = { diasPartido: "S,D", horarioPartido: "08:00 - 22:00" }

describe("courtSelectorOptions", () => {
  it("no ofrece nada con una sola cancha: el resumen ya es su horario", () => {
    expect(courtSelectorOptions([norte])).toEqual([])
    expect(courtSelectorOptions([])).toEqual([])
  })

  it("pone 'Todas las canchas' primero y después cada cancha en orden", () => {
    expect(courtSelectorOptions([norte, sur])).toEqual([
      { id: TODAS_LAS_CANCHAS, nombre: "Todas las canchas" },
      { id: "c1", nombre: "Norte" },
      { id: "c2", nombre: "Sur" },
    ])
  })
})

describe("selectedCourtSchedule", () => {
  it("sin selección devuelve el resumen, que es lo que se ve al abrir", () => {
    expect(selectedCourtSchedule([norte, sur], resumen, null)).toEqual(resumen)
    expect(selectedCourtSchedule([norte, sur], resumen, TODAS_LAS_CANCHAS)).toEqual(resumen)
  })

  // Es el bug: la tarjeta mostraba la unión aunque ninguna cancha jugara en ese rango.
  it("con una cancha elegida devuelve los suyos, no la unión", () => {
    expect(selectedCourtSchedule([norte, sur], resumen, "c2"))
      .toEqual({ diasPartido: "D", horarioPartido: "18:00 - 22:00" })
  })

  // La división pudo cambiar de canchas entre que se abrió la pantalla y ahora.
  it("cae al resumen si el id ya no corresponde a ninguna cancha", () => {
    expect(selectedCourtSchedule([norte, sur], resumen, "borrada")).toEqual(resumen)
  })

  it("tolera una división sin horario configurado", () => {
    const vacio = { diasPartido: null, horarioPartido: null }
    expect(selectedCourtSchedule([], vacio, null)).toEqual(vacio)
  })
})

describe("courtScheduleLines", () => {
  it("prefiere el nombre que ya viene en la fila", () => {
    const rows = [{ canchaId: "c1", diasPartido: "S", horarioPartido: "08:00 - 12:00", cancha: { nombre: "Norte" } }]
    expect(courtScheduleLines(rows)[0].nombre).toBe("Norte")
  })

  it("lo resuelve contra las canchas cuando la fila no lo trae", () => {
    const rows = [{ canchaId: "c1", diasPartido: "S", horarioPartido: "08:00 - 12:00" }]
    expect(courtScheduleLines(rows, [{ id: "c1", nombre: "Norte" }])[0].nombre).toBe("Norte")
  })

  it("cae a una etiqueta genérica si no hay de dónde sacarlo", () => {
    const rows = [{ canchaId: "c1", diasPartido: "S", horarioPartido: "08:00 - 12:00" }]
    expect(courtScheduleLines(rows)[0].nombre).toBe("Cancha")
  })
})
