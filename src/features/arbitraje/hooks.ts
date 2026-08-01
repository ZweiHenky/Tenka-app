import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { refereeApi } from "./api"

const key = (leagueId: string) => ["referee-batches", leagueId] as const
export const useRefereeBatches = (leagueId: string) => useQuery({ queryKey: key(leagueId), queryFn: () => refereeApi.list(leagueId), enabled: !!leagueId })
export const useRefereeCandidates = (leagueId: string) => useQuery({ queryKey: ["referee-candidates", leagueId], queryFn: () => refereeApi.candidates(leagueId), enabled: !!leagueId, refetchOnMount: "always" })

export function useRefereeMutations(leagueId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: key(leagueId) })
  return {
    saveLeagueAssignments: useMutation({
      mutationFn: (body: { asignacionId?: string; divisionIds: string[]; asignaciones: { partidoId: string; arbitroIds: string[] }[] }) => refereeApi.saveLeagueAssignments(leagueId, body),
      onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["referee-candidates", leagueId] }) },
    }),
    removeAssignment: useMutation({
      mutationFn: (assignmentId: string) => refereeApi.removeAssignment(leagueId, assignmentId),
      onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["referee-candidates", leagueId] }) },
    }),
  }
}
