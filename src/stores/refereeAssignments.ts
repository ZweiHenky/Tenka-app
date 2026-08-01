import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface LeagueAssignmentDraft {
  selectedDivisionIds: string[]
  assignments: Record<string, string[]>
  hasUnsavedChanges: boolean
  lastSavedAssignmentId?: string
}

interface RefereeAssignmentState {
  drafts: Record<string, LeagueAssignmentDraft>
  hydrate: (leagueId: string, selectedDivisionIds: string[], assignments: Record<string, string[]>) => void
  setSelectedDivisions: (leagueId: string, divisionIds: string[], removedMatchIds: string[]) => void
  setMatchReferees: (leagueId: string, matchId: string, refereeIds: string[]) => void
  clearAssignments: (leagueId: string, matchIds: string[]) => void
  completeAssignment: (leagueId: string, assignmentId: string) => void
}

const emptyDraft = (): LeagueAssignmentDraft => ({ selectedDivisionIds: [], assignments: {}, hasUnsavedChanges: false })

export const useRefereeAssignmentStore = create<RefereeAssignmentState>()(persist((set) => ({
  drafts: {},
  hydrate: (leagueId, selectedDivisionIds, assignments) => set((state) => {
    const current = state.drafts[leagueId]
    if (current?.hasUnsavedChanges) return state
    return { drafts: { ...state.drafts, [leagueId]: { selectedDivisionIds: current?.selectedDivisionIds.length ? current.selectedDivisionIds : selectedDivisionIds, assignments, hasUnsavedChanges: false } } }
  }),
  setSelectedDivisions: (leagueId, divisionIds, removedMatchIds) => set((state) => {
    const current = state.drafts[leagueId] ?? emptyDraft()
    const assignments = { ...current.assignments }
    removedMatchIds.forEach((matchId) => delete assignments[matchId])
    return { drafts: { ...state.drafts, [leagueId]: { selectedDivisionIds: divisionIds, assignments, hasUnsavedChanges: true } } }
  }),
  setMatchReferees: (leagueId, matchId, refereeIds) => set((state) => {
    const current = state.drafts[leagueId] ?? emptyDraft()
    return { drafts: { ...state.drafts, [leagueId]: { ...current, assignments: { ...current.assignments, [matchId]: refereeIds }, hasUnsavedChanges: true } } }
  }),
  clearAssignments: (leagueId, matchIds) => set((state) => {
    const current = state.drafts[leagueId] ?? emptyDraft()
    const assignments = { ...current.assignments }
    matchIds.forEach((matchId) => { assignments[matchId] = [] })
    return { drafts: { ...state.drafts, [leagueId]: { ...current, assignments, hasUnsavedChanges: true } } }
  }),
  completeAssignment: (leagueId, assignmentId) => set((state) => {
    return { drafts: { ...state.drafts, [leagueId]: { selectedDivisionIds: [], assignments: {}, hasUnsavedChanges: false, lastSavedAssignmentId: assignmentId } } }
  }),
}), {
  name: "referee-assignment-drafts",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ drafts: state.drafts }),
}))
