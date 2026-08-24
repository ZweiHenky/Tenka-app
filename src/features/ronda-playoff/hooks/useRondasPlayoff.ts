import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { BracketPair, Siembra } from "@/features/division/utils/playoff"
import { rondaPlayoffApi, type RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import { divisionCampeonKey, historialCampeonesKey } from "@/features/division-campeon/queryKeys"
import { removeDeletedQuery } from "@/shared/utils/query-cache"

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
    mutationFn: ({ leagueId: _leagueId, ...data }: { divisionId: string; cantidadEquipos: number; siembra?: Siembra; llaves?: BracketPair[]; leagueId?: string }) =>
      rondaPlayoffApi.generate(data),
    onSuccess: (rounds, vars) => {
      qc.setQueryData(["rondas-playoff", vars.divisionId], rounds)
      // Generar el cuadro archiva el campeón vigente: cambia el banner y el historial.
      qc.setQueryData(divisionCampeonKey(vars.divisionId), null)
      qc.invalidateQueries({ queryKey: historialCampeonesKey(vars.divisionId), exact: true })
      if (vars.leagueId) qc.invalidateQueries({ queryKey: ["referee-candidates", vars.leagueId], exact: true, refetchType: "none" })
    },
  })
}

export function useDeleteRondasByDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId }: { divisionId: string; leagueId?: string }) => rondaPlayoffApi.deleteByDivision(divisionId),
    onSuccess: (_data, variables) => {
      // Los partidos del cuadro se fueron con las rondas, y el servidor borra además las jornadas
      // que quedaron sin ninguno. Sin refrescar estas claves, con el staleTime de 5 minutos la app
      // seguiría mostrando jornadas que ya no existen.
      const rondas = qc.getQueryData<RondaPlayoff[]>(["rondas-playoff", variables.divisionId]) ?? []
      qc.setQueryData(["rondas-playoff", variables.divisionId], [])
      for (const partido of rondas.flatMap((ronda) => ronda.partidos)) {
        removeDeletedQuery(qc, ["partido", partido.id])
        removeDeletedQuery(qc, ["referee-link-status", partido.id])
      }
      qc.invalidateQueries({ queryKey: ["jornadas", variables.divisionId], exact: true })
      qc.invalidateQueries({ queryKey: ["jornadas-infinitas", variables.divisionId], exact: true })
      qc.invalidateQueries({ queryKey: ["last-jornada", variables.divisionId], exact: true })
      // El campeón **no** se toca al borrar el cuadro: sigue vigente y se puede corregir a mano.
      if (variables.leagueId) qc.invalidateQueries({ queryKey: ["referee-candidates", variables.leagueId], exact: true, refetchType: "none" })
    },
  })
}
