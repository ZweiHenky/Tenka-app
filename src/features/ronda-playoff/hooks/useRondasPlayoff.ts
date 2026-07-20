import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { rondaPlayoffApi } from "@/features/ronda-playoff/api/rondasPlayoff"

export function useRondasPlayoff(divisionId: string | null) {
  return useQuery({
    queryKey: ["rondas-playoff", divisionId],
    queryFn: () => rondaPlayoffApi.listByDivision(divisionId!),
    enabled: !!divisionId,
  })
}

export function useGenerateRondas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { divisionId: string; cantidadEquipos: number }) =>
      rondaPlayoffApi.generate(data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["rondas-playoff", vars.divisionId] })
    },
  })
}

export function useDeleteRondasByDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (divisionId: string) => rondaPlayoffApi.deleteByDivision(divisionId),
    onSuccess: (_data, divisionId) => {
      qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] })
      qc.invalidateQueries({ queryKey: ["partidos-ultima-ronda"] })
    },
  })
}
