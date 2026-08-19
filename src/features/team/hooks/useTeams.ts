import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { teamApi } from "@/features/team/api/teams"
import type { EquipoResponse } from "@/features/team/api/teams"
import type { DivisionEquipoByDivision } from "@/features/division-equipo/api/division-equipo"
import { committed, notCommitted, withAmbiguousWriteRecovery } from "@/infrastructure/api/ambiguous-write"

export function useTeam(id?: string, enabled = true) {
  return useQuery({
    queryKey: ["teams", id],
    queryFn: () => teamApi.getById(id!),
    enabled: enabled && !!id,
  })
}

export function useUserTeams(userId: string) {
  return useQuery({
    queryKey: ["teams", "user", userId],
    queryFn: () => teamApi.listByUser(userId),
    enabled: !!userId,
  })
}

export function useCreateTeam(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; logoAssetId?: string | null }) => withAmbiguousWriteRecovery(
      () => teamApi.create(data),
      async () => {
        const teams = await teamApi.listByUser(userId)
        const team = teams.find((entry) => entry.nombre.trim().toLowerCase() === data.nombre.trim().toLowerCase())
        return team ? committed(team) : notCommitted()
      },
    ),
    onSuccess: (team) => {
      qc.setQueryData(["teams", team.id], team)
      qc.setQueryData<EquipoResponse[]>(["teams", "user", userId], (current) =>
        current && !current.some((entry) => entry.id === team.id) ? [...current, team] : current,
      )
    },
  })
}

export function useUpdateTeam(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre?: string; logoAssetId?: string | null } }) => {
      const before = qc.getQueryData<EquipoResponse>(["teams", id])
      return withAmbiguousWriteRecovery(
        () => teamApi.update(id, data),
        async () => {
          const team = await teamApi.getById(id)
          const nameMatches = data.nombre === undefined || team.nombre === data.nombre.trim()
          const logoMatches = data.logoAssetId === undefined
            || (data.logoAssetId === null ? team.logo === null : !!team.logo && team.logo !== before?.logo)
          return nameMatches && logoMatches ? committed(team) : notCommitted()
        },
      )
    },
    onSuccess: (team) => {
      qc.setQueryData(["teams", team.id], team)
      qc.setQueryData<EquipoResponse[]>(["teams", "user", userId], (current) =>
        current?.map((entry) => entry.id === team.id ? team : entry),
      )
      qc.setQueriesData<DivisionEquipoByDivision[]>({
        queryKey: ["division-equipos"],
        predicate: (query) => query.queryKey.length === 2 && query.queryKey[1] !== "equipo",
      }, (current) => current?.map((link) => link.equipoId === team.id ? { ...link, equipo: { ...link.equipo, ...team } } : link))
    },
  })
}

export function useDeleteTeam(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmName }: { id: string; confirmName?: string }) => teamApi.delete(id, confirmName),
    onSuccess: (_data, { id }) => {
      qc.removeQueries({ queryKey: ["teams", id], exact: true })
      qc.setQueryData<EquipoResponse[]>(["teams", "user", userId], (current) => current?.filter((entry) => entry.id !== id))
    },
  })
}
