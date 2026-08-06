import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { teamApi } from "@/features/team/api/teams"

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: () => teamApi.list(),
  })
}

export function useTeam(id?: string) {
  return useQuery({
    queryKey: ["teams", id],
    queryFn: () => teamApi.getById(id!),
    enabled: !!id,
  })
}

export function useUserTeams(userId: string) {
  return useQuery({
    queryKey: ["teams", "user", userId],
    queryFn: () => teamApi.list(userId),
    enabled: !!userId,
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; logoAssetId?: string | null }) => teamApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre?: string; logoAssetId?: string | null } }) =>
      teamApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  })
}
