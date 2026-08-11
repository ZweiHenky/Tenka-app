import { describe, expect, it } from "vitest"
import { allocationsFromAnnotations, buildResultAnnotations, buildResultPayload, buildScorerCandidates, canSetAllocation, filterScorerCandidatesByParticipants, hasValidAllocations, isParticipant, isResultEditable, participacionesFromResponse, toggleParticipacion, type ParticipacionInput, type ScorerAllocation, type ScorerCandidate } from "./scoring"

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

  it("keeps private notas in the result payload", () => {
    expect(buildResultPayload({ expectedVersion: 7, estado: "FINALIZADO", golesLocal: 3, golesVisitante: 1, allocations, notas: "Incidencias del partido" }).notas).toBe("Incidencias del partido")
  })

  it("omits notas from the payload when not provided", () => {
    expect(buildResultPayload({ expectedVersion: 7, estado: "FINALIZADO", golesLocal: 3, golesVisitante: 1, allocations }).notas).toBeUndefined()
  })
})

describe("result participaciones", () => {
  it("prefills participants from response and ignores null ids", () => {
    expect(participacionesFromResponse([
      { ladoMarcador: "LOCAL", jugadorId: "player-1" },
      { ladoMarcador: "LOCAL", jugadorId: null },
      { ladoMarcador: "VISITANTE", jugadorId: "player-2" },
    ])).toEqual([
      { ladoMarcador: "LOCAL", jugadorId: "player-1" },
      { ladoMarcador: "VISITANTE", jugadorId: "player-2" },
    ])
  })

  it("toggles participation per side and moves the player atomically across sides", () => {
    let list = toggleParticipacion([], "LOCAL", "player-1")
    expect(list).toEqual([{ ladoMarcador: "LOCAL", jugadorId: "player-1" }])
    list = toggleParticipacion(list, "LOCAL", "player-1")
    expect(list).toEqual([])
    list = toggleParticipacion([], "LOCAL", "player-1")
    list = toggleParticipacion(list, "VISITANTE", "player-1")
    expect(list).toEqual([{ ladoMarcador: "VISITANTE", jugadorId: "player-1" }])
    list = toggleParticipacion(list, "VISITANTE", "player-1")
    expect(list).toEqual([])
  })

  it("tracks participation presence per side", () => {
    const list: ParticipacionInput[] = [{ ladoMarcador: "LOCAL", jugadorId: "player-1" }]
    expect(isParticipant(list, "LOCAL", "player-1")).toBe(true)
    expect(isParticipant(list, "VISITANTE", "player-1")).toBe(false)
  })

  it("keeps participaciones in the result payload", () => {
    const participaciones: ParticipacionInput[] = [{ ladoMarcador: "LOCAL", jugadorId: "player-1" }]
    expect(buildResultPayload({ expectedVersion: 7, estado: "FINALIZADO", golesLocal: 3, golesVisitante: 1, allocations, participaciones }).participaciones).toEqual(participaciones)
  })

  it("omits participaciones from the payload when capture is disabled", () => {
    expect(buildResultPayload({ expectedVersion: 7, estado: "FINALIZADO", golesLocal: 3, golesVisitante: 1, allocations }).participaciones).toBeUndefined()
  })

  it("merges historical records into scorer candidates preserving name and dorsal", () => {
    const candidates = buildScorerCandidates(
      [{ id: "player-1", nombre: "Ana", foto: null, dorsal: 9 }],
      [
        { ladoMarcador: "LOCAL", jugadorId: "player-1", jugadorNombre: "Ana", dorsal: 9 },
        { ladoMarcador: "LOCAL", jugadorId: "player-deleted", jugadorNombre: "Luis histórico", dorsal: 7 },
        { ladoMarcador: "VISITANTE", jugadorId: "player-2", jugadorNombre: "Otro", dorsal: 4 },
      ],
      "LOCAL",
    )
    expect(candidates).toEqual([
      { id: "player-1", nombre: "Ana", foto: null, dorsal: 9 },
      { id: "player-deleted", nombre: "Luis histórico", foto: null, dorsal: 7 },
    ])
  })

  it("keeps scorer and participant candidate pools separate", () => {
    const roster = [{ id: "player-1", nombre: "Ana", foto: null, dorsal: 9 }]
    const anotaciones = [{ ladoMarcador: "LOCAL" as const, jugadorId: "player-scorer", jugadorNombre: "Goleador histórico", dorsal: 5 }]
    const participaciones = [{ ladoMarcador: "LOCAL" as const, jugadorId: "player-participant", jugadorNombre: "Participante histórico", dorsal: 8 }]
    const scorerCandidates = buildScorerCandidates(roster, anotaciones, "LOCAL")
    const participantCandidates = buildScorerCandidates(roster, participaciones, "LOCAL")
    expect(scorerCandidates.map((item) => item.id)).toEqual(["player-1", "player-scorer"])
    expect(participantCandidates.map((item) => item.id)).toEqual(["player-1", "player-participant"])
  })

  it("limits scorer candidates to the participants assigned on each side", () => {
    const players: ScorerCandidate[] = [
      { id: "player-1", nombre: "Ana", foto: null, dorsal: 9 },
      { id: "player-2", nombre: "Luis", foto: null, dorsal: 7 },
      { id: "player-3", nombre: "Otro", foto: null, dorsal: 4 },
    ]
    const participaciones: ParticipacionInput[] = [
      { ladoMarcador: "LOCAL", jugadorId: "player-1" },
      { ladoMarcador: "VISITANTE", jugadorId: "player-3" },
    ]
    expect(filterScorerCandidatesByParticipants(players, participaciones, "LOCAL").map((item) => item.id)).toEqual(["player-1"])
    expect(filterScorerCandidatesByParticipants(players, participaciones, "VISITANTE").map((item) => item.id)).toEqual(["player-3"])
  })

  it("returns no candidates when no participants are assigned", () => {
    const players: ScorerCandidate[] = [
      { id: "player-1", nombre: "Ana", foto: null, dorsal: 9 },
      { id: "player-2", nombre: "Luis", foto: null, dorsal: 7 },
    ]
    expect(filterScorerCandidatesByParticipants(players, [], "LOCAL")).toEqual([])
  })
})
