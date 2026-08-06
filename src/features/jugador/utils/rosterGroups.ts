import type { PosicionJugador } from "@/domain/interfaces/player"

export type RosterGroupKey = "delanteros" | "medios" | "defensas" | "porteros"

export interface RosterGroup<T> {
  key: RosterGroupKey
  label: string
  players: T[]
}

const GROUPS: { key: RosterGroupKey; label: string; positions: PosicionJugador[] }[] = [
  { key: "delanteros", label: "Delanteros", positions: ["DELANTERO", "EXTREMO"] },
  { key: "medios", label: "Medios", positions: ["MEDIO", "CONTENCION"] },
  { key: "defensas", label: "Defensas", positions: ["DEFENSA", "LATERAL"] },
  { key: "porteros", label: "Porteros", positions: ["PORTERO"] },
]

export function groupDivisionRoster<T extends { dorsal: number; jugador: { nombre: string; posicion: PosicionJugador } }>(rows: T[]): RosterGroup<T>[] {
  return GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    players: rows
      .filter((row) => group.positions.includes(row.jugador.posicion))
      .sort((left, right) => left.dorsal - right.dorsal || left.jugador.nombre.localeCompare(right.jugador.nombre, "es", { sensitivity: "base" })),
  }))
}
