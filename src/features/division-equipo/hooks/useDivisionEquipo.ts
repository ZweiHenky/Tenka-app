import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"

export function useDivisionEquipos(divisionId: string) {
  return useQuery({
    queryKey: ["division-equipos", divisionId],
    queryFn: () => divisionEquipoApi.findByDivision(divisionId),
    enabled: !!divisionId,
    staleTime: 1000 * 30,
  })
}

export function useAssignTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { divisionId: string; equipoId: string }) => divisionEquipoApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["division-equipos"] }),
  })
}

export function useRemoveTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, equipoId }: { divisionId: string; equipoId: string }) =>
      divisionEquipoApi.remove(divisionId, equipoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["division-equipos"] }),
  })
}

export function useUpdateTeamSaldo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, equipoId, saldoPendiente }: { divisionId: string; equipoId: string; saldoPendiente: string }) =>
      divisionEquipoApi.updateSaldo(divisionId, equipoId, saldoPendiente),
    onSuccess: (_data, variables) => qc.invalidateQueries({
      queryKey: ["division-equipos", variables.divisionId],
      exact: true,
    }),
  })
}
