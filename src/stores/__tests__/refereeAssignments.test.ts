import { beforeEach, describe, expect, it, vi } from "vitest"
import { useRefereeAssignmentStore } from "../refereeAssignments"

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

describe("referee assignment draft", () => {
  beforeEach(() => useRefereeAssignmentStore.setState({ drafts: {} }))

  it("hydrates assignments already saved on the server", () => {
    useRefereeAssignmentStore.getState().hydrate("league", ["division"], { match: ["referee"] })

    expect(useRefereeAssignmentStore.getState().drafts.league).toEqual({
      selectedDivisionIds: ["division"],
      assignments: { match: ["referee"] },
      hasUnsavedChanges: false,
    })
  })

  it("preserves a pending local draft during server refresh", () => {
    const store = useRefereeAssignmentStore.getState()
    store.setSelectedDivisions("league", ["division"], [])
    store.setMatchReferees("league", "match", ["local-referee"])
    useRefereeAssignmentStore.getState().hydrate("league", ["other"], { match: ["server-referee"] })

    expect(useRefereeAssignmentStore.getState().drafts.league.assignments.match).toEqual(["local-referee"])
  })

  it("removes assignments for divisions removed from the draft", () => {
    const store = useRefereeAssignmentStore.getState()
    store.hydrate("league", ["one", "two"], { first: ["a"], second: ["b"] })
    useRefereeAssignmentStore.getState().setSelectedDivisions("league", ["one"], ["second"])

    const draft = useRefereeAssignmentStore.getState().drafts.league
    expect(draft.selectedDivisionIds).toEqual(["one"])
    expect(draft.assignments).toEqual({ first: ["a"] })
    expect(draft.hasUnsavedChanges).toBe(true)
  })

  it("completes the draft and starts clean after saving", () => {
    useRefereeAssignmentStore.getState().setMatchReferees("league", "match", ["a", "b"])
    useRefereeAssignmentStore.getState().completeAssignment("league", "assignment")

    expect(useRefereeAssignmentStore.getState().drafts.league).toEqual({ selectedDivisionIds: [], assignments: {}, hasUnsavedChanges: false, lastSavedAssignmentId: "assignment" })
  })

  it("clears only the requested local assignments", () => {
    useRefereeAssignmentStore.getState().hydrate("league", ["division"], { first: ["a"], second: ["b"] })
    useRefereeAssignmentStore.getState().clearAssignments("league", ["first"])

    const draft = useRefereeAssignmentStore.getState().drafts.league
    expect(draft.assignments).toEqual({ first: [], second: ["b"] })
    expect(draft.hasUnsavedChanges).toBe(true)
  })
})
