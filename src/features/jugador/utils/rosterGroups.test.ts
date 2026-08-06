import { describe, expect, it } from "vitest"
import type { PosicionJugador } from "@/domain/interfaces/player"
import { groupDivisionRoster } from "./rosterGroups"

function player(nombre: string, posicion: PosicionJugador, dorsal: number) {
  return { dorsal, jugador: { nombre, posicion } }
}

describe("groupDivisionRoster", () => {
  it("classifies every player position into the four display groups", () => {
    const groups = groupDivisionRoster([
      player("Nueve", "DELANTERO", 9),
      player("Extremo", "EXTREMO", 11),
      player("Medio", "MEDIO", 8),
      player("Contención", "CONTENCION", 5),
      player("Central", "DEFENSA", 4),
      player("Lateral", "LATERAL", 2),
      player("Portero", "PORTERO", 1),
    ])

    expect(groups.map((group) => [group.key, group.players.map((row) => row.jugador.nombre)])).toEqual([
      ["delanteros", ["Nueve", "Extremo"]],
      ["medios", ["Contención", "Medio"]],
      ["defensas", ["Lateral", "Central"]],
      ["porteros", ["Portero"]],
    ])
  })

  it("keeps empty groups and sorts by dorsal then name", () => {
    const groups = groupDivisionRoster([
      player("Zeta", "DELANTERO", 10),
      player("Ángel", "EXTREMO", 10),
      player("Primero", "DELANTERO", 7),
    ])

    expect(groups).toHaveLength(4)
    expect(groups[0].players.map((row) => row.jugador.nombre)).toEqual(["Primero", "Ángel", "Zeta"])
    expect(groups.slice(1).every((group) => group.players.length === 0)).toBe(true)
  })
})
