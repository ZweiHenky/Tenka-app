import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { rondaPlayoffApi } from "@/features/ronda-playoff/api/rondasPlayoff"

export function useRondasPlayoff(divisionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["rondas-playoff", divisionId],
    queryFn: () => rondaPlayoffApi.listByDivision(divisionId!),
    enabled: enabled && !!divisionId,
  })
}

export function useGenerateRondas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leagueId: _leagueId, ...data }: { divisionId: string; cantidadEquipos: number; leagueId?: string }) =>
      rondaPlayoffApi.generate(data),
    onSuccess: (rounds, vars) => {
      qc.setQueryData(["rondas-playoff", vars.divisionId], rounds)
      if (vars.leagueId) qc.invalidateQueries({ queryKey: ["referee-candidates", vars.leagueId], exact: true, refetchType: "none" })
    },
  })
}

export function useDeleteRondasByDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId }: { divisionId: string; leagueId?: string }) => rondaPlayoffApi.deleteByDivision(divisionId),
    onSuccess: (_data, variables) => {
      qc.setQueryData(["rondas-playoff", variables.divisionId], [])
      if (variables.leagueId) qc.invalidateQueries({ queryKey: ["referee-candidates", variables.leagueId], exact: true, refetchType: "none" })
    },
  })
}
