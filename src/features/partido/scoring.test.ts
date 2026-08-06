import { describe, expect, it } from "vitest"
import { allocationsFromAnnotations, buildResultAnnotations, buildResultPayload, canSetAllocation, hasValidAllocations, isResultEditable, type ScorerAllocation } from "./scoring"

const allocations: ScorerAllocation[] = [
  { ladoMarcador: "LOCAL", jugadorId: "player-1", cantidad: 2 },
  { ladoMarcador: "VISITANTE", jugadorId: "player-2", cantidad: 1 },
]

describe("result scorer allocations", () => {
  it("builds assigned and explicit unassigned goal rows", () => {
    expect(buildResultAnnotations(allocations, 3, 1)).toEqual([
      { ladoMarcador: "LOCAL", jugadorId: "player-1", cantidad: 2 },
      { ladoMarcador: "VISITANTE", jugadorId: "player-2", cantidad: 1 },
      { ladoMarcador: "LOCAL", jugadorId: null, cantidad: 1 },
    ])
  })

  it("prevents a player quantity from taking a side over its score", () => {
    expect(canSetAllocation(allocations, "LOCAL", "player-3", 2, 3)).toBe(false)
    expect(canSetAllocation(allocations, "LOCAL", "player-1", 3, 3)).toBe(true)
    expect(hasValidAllocations(allocations, 1, 1)).toBe(false)
  })

  it("prefills attributed annotations and ignores unassigned rows", () => {
    expect(allocationsFromAnnotations([
      { ladoMarcador: "LOCAL", jugadorId: "player-1", cantidad: 1 },
      { ladoMarcador: "LOCAL", jugadorId: null, cantidad: 2 },
    ])).toEqual([{ ladoMarcador: "LOCAL", jugadorId: "player-1", cantidad: 1 }])
  })

  it("builds the referee result payload with optimistic versioning", () => {
    expect(buildResultPayload({ expectedVersion: 7, estado: "FINALIZADO", golesLocal: 3, golesVisitante: 1, allocations })).toEqual({
      expectedVersion: 7,
      estado: "FINALIZADO",
      golesLocal: 3,
      golesVisitante: 1,
      allocations: buildResultAnnotations(allocations, 3, 1),
    })
  })

  it("only unlocks a finalized result through correction mode", () => {
    expect(isResultEditable("FINALIZADO", false)).toBe(false)
    expect(isResultEditable("FINALIZADO", true)).toBe(true)
    expect(isResultEditable("PROGRAMADO", false)).toBe(true)
  })
})
