import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"

export function useDivisionEquipos(divisionId: string) {
  return useQuery({
    queryKey: ["division-equipos", divisionId],
    queryFn: () => divisionEquipoApi.findByDivision(divisionId),
    enabled: !!divisionId,
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
