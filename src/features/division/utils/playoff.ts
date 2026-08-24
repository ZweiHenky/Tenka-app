export const PLAYOFF_TEAM_OPTIONS = [2, 4, 8, 16, 32] as const

export function getPlayoffTeamOptions(assignedTeamCount: number): number[] {
  return PLAYOFF_TEAM_OPTIONS.filter((teamCount) => teamCount <= assignedTeamCount)
}

export function getPlayoffRoundMatchCounts(roundCount: number): number[] {
  if (!Number.isInteger(roundCount) || roundCount < 1) return []

  return Array.from({ length: roundCount }, (_, roundIndex) =>
    2 ** (roundCount - roundIndex - 1),
  )
}

export type Siembra = "POSICIONES" | "ALEATORIA" | "MANUAL"

/** Un cruce en construcción: el usuario puede tener solo un lado elegido todavía. */
export interface BracketPairDraft {
  equipoLocalId?: string
  equipoVisitanteId?: string
}

export interface BracketPair {
  equipoLocalId: string
  equipoVisitanteId: string
}

/**
 * Qué le falta al cuadro manual para poder enviarse. Se valida acá y no en el modal para poder
 * probarlo sin montar la pantalla; el backend vuelve a validar contra los equipos reales, que es
 * la única comprobación que manda.
 */
export function validateBracketPairs(
  pairs: BracketPairDraft[],
  cantidadEquipos: number,
): string | null {
  const esperadas = cantidadEquipos / 2
  if (pairs.length !== esperadas) {
    return `Arma ${esperadas} ${esperadas === 1 ? "cruce" : "cruces"}`
  }

  const vistos = new Map<string, number>()
  for (const [index, pair] of pairs.entries()) {
    if (!pair.equipoLocalId || !pair.equipoVisitanteId) {
      return `Completa los dos equipos del cruce #${index + 1}`
    }
    if (pair.equipoLocalId === pair.equipoVisitanteId) {
      return `El cruce #${index + 1} enfrenta a un equipo consigo mismo`
    }
    for (const equipoId of [pair.equipoLocalId, pair.equipoVisitanteId]) {
      const anterior = vistos.get(equipoId)
      if (anterior !== undefined) {
        return `Un equipo está repetido en los cruces #${anterior + 1} y #${index + 1}`
      }
      vistos.set(equipoId, index)
    }
  }
  return null
}

/** Los cruces listos para enviar, o `null` si todavía les falta algo. */
export function buildBracketPairs(
  pairs: BracketPairDraft[],
  cantidadEquipos: number,
): BracketPair[] | null {
  if (validateBracketPairs(pairs, cantidadEquipos) !== null) return null
  return pairs.map((pair) => ({
    equipoLocalId: pair.equipoLocalId!,
    equipoVisitanteId: pair.equipoVisitanteId!,
  }))
}

/** Equipos que todavía no están en ningún cruce, para no ofrecer uno ya usado. */
export function availableTeamsForPair(
  teams: { id: string }[],
  pairs: BracketPairDraft[],
  pairIndex: number,
  side: "local" | "visitante",
): { id: string }[] {
  const usados = new Set<string>()
  pairs.forEach((pair, index) => {
    for (const [ladoActual, equipoId] of [["local", pair.equipoLocalId], ["visitante", pair.equipoVisitanteId]] as const) {
      if (!equipoId) continue
      // El equipo que ya está en este mismo hueco sigue disponible: es el valor actual.
      if (index === pairIndex && ladoActual === side) continue
      usados.add(equipoId)
    }
  })
  return teams.filter((team) => !usados.has(team.id))
}
