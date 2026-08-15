import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { refereeApi } from "./api"

const key = (leagueId: string) => ["referee-batches", leagueId] as const
export const useRefereeBatches = (leagueId: string, enabled = true) => useQuery({ queryKey: key(leagueId), queryFn: () => refereeApi.list(leagueId), enabled: enabled && !!leagueId })
export const useRefereeCandidates = (leagueId: string, enabled = true) => useInfiniteQuery({
  queryKey: ["referee-candidates", leagueId],
  queryFn: ({ pageParam }) => refereeApi.candidates(leagueId, pageParam),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => lastPage.rows.length > 0 && lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
  enabled: enabled && !!leagueId,
})

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
