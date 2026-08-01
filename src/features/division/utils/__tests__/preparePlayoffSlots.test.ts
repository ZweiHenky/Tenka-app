import { describe, expect, it } from "vitest"
import { preparePlayoffSlots } from "../preparePlayoffSlots"

const division = {
  diasPartido: "lun",
  horarioPartido: "08:00-10:00",
  duracionPartido: 60,
  descanso: 0,
}

describe("preparePlayoffSlots", () => {
  it("creates slots from a compact time range", () => {
    const slots = preparePlayoffSlots([], division, [
      { id: "p1", nombre: "Semifinal", llave: 1 },
      { id: "p2", nombre: "Semifinal", llave: 2 },
    ])

    expect(slots).toHaveLength(2)
    expect(slots.map((slot) => slot.horaInicio)).toEqual(["08:00", "09:00"])
    expect(slots.map((slot) => slot.partidoId)).toEqual(["p1", "p2"])
  })

  it("supports multiple ranges separated by a slash", () => {
    const slots = preparePlayoffSlots([], {
      ...division,
      horarioPartido: "08:00 - 09:00 / 18:00 - 19:00",
    }, [
      { id: "p1", nombre: "Semifinal", llave: 1 },
      { id: "p2", nombre: "Semifinal", llave: 2 },
    ])

    expect(slots.map((slot) => slot.horaInicio)).toEqual(["08:00", "18:00"])
  })

  it("skips times already occupied by existing slots", () => {
    const first = preparePlayoffSlots([], division, [
      { id: "p1", nombre: "Semifinal", llave: 1 },
    ])[0]
    const slots = preparePlayoffSlots([first], division, [
      { id: "p2", nombre: "Semifinal", llave: 2 },
    ])

    expect(slots).toHaveLength(1)
    expect(slots[0].fecha).toBe(first.fecha)
    expect(slots[0].horaInicio).toBe("09:00")
  })
})
