import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { leagueApi } from "@/features/league/api/leagues"
import type { CreateLeagueInput } from "@/domain/interfaces/league"

const KEY = "leagues"

export function useLeagues() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => leagueApi.list(),
  })
}

export function useUserLeagues(userId: string) {
  return useQuery({
    queryKey: [KEY, "user", userId],
    queryFn: () => leagueApi.list(userId),
    enabled: !!userId,
  })
}

export function useLeague(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => leagueApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLeagueInput) => leagueApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ["ligas-infinitas"] })
    },
  })
}

export function useUpdateLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeagueInput> }) =>
      leagueApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ["ligas-infinitas"] })
    },
  })
}

export function useDeleteLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leagueApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ["ligas-infinitas"] })
    },
  })
}
