import { describe, expect, it } from "vitest"
import { visibleWeekDates } from "./week-dates"

const slot = (fecha: string) => ({ fecha })

// 2026-07-20 es lunes.
const LUNES = "2026-07-20"
const LUN_MAR = [1, 2]

describe("visibleWeekDates", () => {
  it("devuelve la semana configurada cuando no hay slots", () => {
    expect(visibleWeekDates(LUNES, LUN_MAR, [])).toEqual(["2026-07-20", "2026-07-21"])
  })

  // Una división de puro cuadro se crea con cupo 0: no genera slots, así que se queda sin refDate.
  // Sin esta unión, Programación aparecía vacía con los slots del bracket ya guardados.
  it("sin refDate ancla en el slot más temprano y dibuja sus días configurados", () => {
    expect(visibleWeekDates(undefined, LUN_MAR, [slot("2026-08-01"), slot("2026-08-08")]))
      .toEqual(["2026-07-27", "2026-07-28", "2026-08-01", "2026-08-03", "2026-08-04", "2026-08-08"])
  })

  it("incluye slots de semanas posteriores y los días configurados de esa semana", () => {
    expect(visibleWeekDates(LUNES, LUN_MAR, [slot("2026-08-15")]))
      .toEqual(["2026-07-20", "2026-07-21", "2026-08-10", "2026-08-11", "2026-08-15"])
  })

  // El caso reportado: con sábado y domingo configurados y los partidos todos el sábado, el
  // domingo tiene que ofrecerse igual — si no, no hay forma de mover un partido ahí.
  it("ofrece un día configurado que todavía no tiene partidos", () => {
    const SAB_DOM = [6, 0]
    expect(visibleWeekDates(undefined, SAB_DOM, [slot("2026-07-25")]))
      .toEqual(["2026-07-25", "2026-07-26"])
  })

  // Antes esto cambiaba al generar la primera jornada, que es cuando se escribe refDate.
  it("da lo mismo con o sin refDate de la misma semana", () => {
    const SAB_DOM = [6, 0]
    const slots = [slot("2026-07-25")]
    expect(visibleWeekDates(undefined, SAB_DOM, slots)).toEqual(visibleWeekDates(LUNES, SAB_DOM, slots))
  })

  it("normaliza un ancla que no cae en lunes", () => {
    // El sábado 2026-07-25 pertenece a la semana del lunes 2026-07-20.
    expect(visibleWeekDates("2026-07-25", [1], [])).toEqual(["2026-07-20"])
  })

  it("sin refDate y sin slots no hay nada que dibujar", () => {
    expect(visibleWeekDates(undefined, LUN_MAR, [])).toEqual([])
    expect(visibleWeekDates(LUNES, [], [])).toEqual([])
  })

  it("no repite una fecha que ya estaba en la semana", () => {
    expect(visibleWeekDates(LUNES, LUN_MAR, [slot("2026-07-21"), slot("2026-07-21")]))
      .toEqual(["2026-07-20", "2026-07-21"])
  })

  it("devuelve las fechas en orden cronológico", () => {
    expect(visibleWeekDates(LUNES, LUN_MAR, [slot("2026-09-01"), slot("2026-07-25")]))
      .toEqual(["2026-07-20", "2026-07-21", "2026-07-25", "2026-08-31", "2026-09-01"])
  })

  it("descarta fechas inválidas en vez de romper el orden", () => {
    expect(visibleWeekDates(LUNES, [1], [slot(""), slot("no-es-fecha"), slot("2026-07-25")]))
      .toEqual(["2026-07-20", "2026-07-25"])
  })

  it("un refDate inválido no impide mostrar los slots", () => {
    expect(visibleWeekDates("no-es-fecha", LUN_MAR, [slot("2026-08-01")]))
      .toEqual(["2026-07-27", "2026-07-28", "2026-08-01"])
  })

  it("el domingo cae al final de la semana, no al principio", () => {
    expect(visibleWeekDates(LUNES, [0, 1], [])).toEqual(["2026-07-20", "2026-07-26"])
  })
})
