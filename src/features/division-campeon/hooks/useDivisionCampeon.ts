import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { divisionCampeonApi, type AsignarCampeonInput, type DivisionCampeon } from "@/features/division-campeon/api/divisionCampeon"
import { campeonatosEquipoKey, campeonatosJugadorKey, divisionCampeonKey, historialCampeonesKey } from "@/features/division-campeon/queryKeys"

export { campeonatosEquipoKey, campeonatosJugadorKey, divisionCampeonKey, historialCampeonesKey }

export function useDivisionCampeon(divisionId?: string | null, enabled = true) {
  return useQuery({
    queryKey: divisionCampeonKey(divisionId ?? ""),
    queryFn: () => divisionCampeonApi.getByDivision(divisionId!),
    enabled: enabled && !!divisionId,
  })
}

export function useCampeonatosEquipo(equipoId?: string | null, enabled = true) {
  return useQuery({
    queryKey: campeonatosEquipoKey(equipoId ?? ""),
    queryFn: () => divisionCampeonApi.listByEquipo(equipoId!),
    enabled: enabled && !!equipoId,
  })
}

export function useCampeonatosJugador(jugadorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: campeonatosJugadorKey(jugadorId ?? ""),
    queryFn: () => divisionCampeonApi.listByJugador(jugadorId!),
    enabled: enabled && !!jugadorId,
  })
}

export function useHistorialCampeones(divisionId?: string | null, enabled = true) {
  return useQuery({
    queryKey: historialCampeonesKey(divisionId ?? ""),
    queryFn: () => divisionCampeonApi.listHistorialByDivision(divisionId!),
    enabled: enabled && !!divisionId,
  })
}

export function useAssignCampeon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, ...data }: AsignarCampeonInput & { divisionId: string }) =>
      divisionCampeonApi.assign(divisionId, data),
    onSuccess: (campeon: DivisionCampeon, { divisionId }) => {
      qc.setQueryData(divisionCampeonKey(divisionId), campeon)
      qc.invalidateQueries({ queryKey: historialCampeonesKey(divisionId), exact: true })
      // La ficha pública del equipo pinta el palmarés desde esta lista.
      if (campeon.jugadorId) qc.invalidateQueries({ queryKey: campeonatosJugadorKey(campeon.jugadorId), exact: true })
      if (campeon.equipoId) {
        qc.invalidateQueries({ queryKey: ["division-equipos", "equipo", campeon.equipoId], exact: true, refetchType: "none" })
        qc.invalidateQueries({ queryKey: campeonatosEquipoKey(campeon.equipoId), exact: true })
      }
    },
  })
}

export function useRemoveCampeon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId }: { divisionId: string; equipoId?: string | null; jugadorId?: string | null }) => divisionCampeonApi.remove(divisionId),
    onSuccess: (_result, { divisionId, equipoId, jugadorId }) => {
      qc.setQueryData(divisionCampeonKey(divisionId), null)
      qc.invalidateQueries({ queryKey: historialCampeonesKey(divisionId), exact: true })
      if (jugadorId) qc.invalidateQueries({ queryKey: campeonatosJugadorKey(jugadorId), exact: true })
      if (equipoId) {
        qc.invalidateQueries({ queryKey: ["division-equipos", "equipo", equipoId], exact: true, refetchType: "none" })
        qc.invalidateQueries({ queryKey: campeonatosEquipoKey(equipoId), exact: true })
      }
    },
  })
}
