import { describe, expect, it } from "vitest"
import { availableTeamsForPair, buildBracketPairs, validateBracketPairs } from "./playoff"

const pair = (equipoLocalId?: string, equipoVisitanteId?: string) => ({ equipoLocalId, equipoVisitanteId })

describe("validateBracketPairs", () => {
  it("acepta un cuadro completo", () => {
    expect(validateBracketPairs([pair("a", "b"), pair("c", "d")], 4)).toBeNull()
  })

  it("pide la cantidad de cruces que faltan", () => {
    expect(validateBracketPairs([pair("a", "b")], 4)).toBe("Arma 2 cruces")
    expect(validateBracketPairs([], 2)).toBe("Arma 1 cruce")
  })

  it("señala el cruce incompleto", () => {
    expect(validateBracketPairs([pair("a", "b"), pair("c")], 4)).toBe("Completa los dos equipos del cruce #2")
  })

  it("rechaza un equipo contra sí mismo", () => {
    expect(validateBracketPairs([pair("a", "a"), pair("c", "d")], 4)).toBe("El cruce #1 enfrenta a un equipo consigo mismo")
  })

  it("dice en qué cruces está el equipo repetido", () => {
    expect(validateBracketPairs([pair("a", "b"), pair("a", "d")], 4)).toBe("Un equipo está repetido en los cruces #1 y #2")
  })
})

describe("buildBracketPairs", () => {
  it("devuelve los cruces cuando el cuadro está completo", () => {
    expect(buildBracketPairs([pair("a", "b"), pair("c", "d")], 4)).toEqual([
      { equipoLocalId: "a", equipoVisitanteId: "b" },
      { equipoLocalId: "c", equipoVisitanteId: "d" },
    ])
  })

  it("devuelve null mientras falte algo", () => {
    expect(buildBracketPairs([pair("a", "b"), pair("c")], 4)).toBeNull()
  })
})

describe("availableTeamsForPair", () => {
  const teams = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]

  it("no ofrece equipos ya usados en otros cruces", () => {
    const pairs = [pair("a", "b"), pair()]
    expect(availableTeamsForPair(teams, pairs, 1, "local").map((t) => t.id)).toEqual(["c", "d"])
  })

  // Si no, cambiar de opinión en un hueco dejaría fuera al equipo que ya estaba ahí.
  it("mantiene disponible el equipo que ocupa ese mismo hueco", () => {
    const pairs = [pair("a", "b"), pair("c", "d")]
    expect(availableTeamsForPair(teams, pairs, 0, "local").map((t) => t.id)).toEqual(["a"])
  })
})
