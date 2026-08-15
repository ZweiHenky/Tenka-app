import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import type { DivisionEquipoByDivision } from "@/features/division-equipo/api/division-equipo"
import { committed, notCommitted, withAmbiguousWriteRecovery } from "@/infrastructure/api/ambiguous-write"

export function useDivisionEquipos(divisionId: string, enabled = true) {
  return useQuery({
    queryKey: ["division-equipos", divisionId],
    queryFn: () => divisionEquipoApi.findByDivision(divisionId),
    enabled: enabled && !!divisionId,
  })
}

export function useAssignTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { divisionId: string; equipoId: string }) => withAmbiguousWriteRecovery(
      () => divisionEquipoApi.create(data),
      async () => {
        const links = await divisionEquipoApi.findByDivision(data.divisionId)
        const link = links.find((entry) => entry.equipoId === data.equipoId)
        return link ? committed(link) : notCommitted()
      },
    ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["division-equipos", variables.divisionId], exact: true })
      qc.invalidateQueries({ queryKey: ["division-equipos", "equipo", variables.equipoId], exact: true, refetchType: "none" })
    },
  })
}

export function useRemoveTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, equipoId }: { divisionId: string; equipoId: string }) =>
      divisionEquipoApi.remove(divisionId, equipoId),
    onSuccess: (_data, variables) => {
      qc.setQueryData<DivisionEquipoByDivision[]>(["division-equipos", variables.divisionId], (current) =>
        current?.filter((link) => link.equipoId !== variables.equipoId),
      )
      qc.invalidateQueries({ queryKey: ["division-equipos", "equipo", variables.equipoId], exact: true, refetchType: "none" })
    },
  })
}

export function useUpdateTeamSaldo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, equipoId, saldoPendiente }: { divisionId: string; equipoId: string; saldoPendiente: string }) =>
      withAmbiguousWriteRecovery(
        () => divisionEquipoApi.updateSaldo(divisionId, equipoId, saldoPendiente),
        async () => {
          const links = await divisionEquipoApi.findByDivision(divisionId)
          const link = links.find((entry) => entry.equipoId === equipoId && Number(entry.saldoPendiente ?? 0) === Number(saldoPendiente))
          return link ? committed(link) : notCommitted()
        },
      ),
    onSuccess: (updated, variables) => qc.setQueryData<DivisionEquipoByDivision[]>(["division-equipos", variables.divisionId], (current) =>
      current?.map((link) => link.equipoId === variables.equipoId ? { ...link, saldoPendiente: updated.saldoPendiente } : link),
    ),
  })
}
