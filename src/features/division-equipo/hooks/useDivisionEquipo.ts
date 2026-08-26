import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import type { DivisionEquipoByDivision, ReplaceTeamResponse } from "@/features/division-equipo/api/division-equipo"
import { committed, notCommitted, withAmbiguousWriteRecovery } from "@/infrastructure/api/ambiguous-write"
import { divisionCampeonKey, historialCampeonesKey, campeonatosEquipoKey } from "@/features/division-campeon/queryKeys"
import { useDivisionScheduleStore } from "@/stores/divisionSchedule"

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

export function useReplaceTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, equipoActualId, equipoNuevoId }: { divisionId: string; equipoActualId: string; equipoNuevoId: string }) =>
      withAmbiguousWriteRecovery(
        () => divisionEquipoApi.replace(divisionId, equipoActualId, equipoNuevoId),
        async () => {
          const links = await divisionEquipoApi.findByDivision(divisionId)
          const target = links.find((entry) => entry.equipoId === equipoNuevoId)
          const sourcePresent = links.some((entry) => entry.equipoId === equipoActualId)
          return target && !sourcePresent
            ? committed<ReplaceTeamResponse>({ ...target, equipoReemplazadoId: equipoActualId, partidosActualizados: 0 })
            : notCommitted()
        },
      ),
    onSuccess: (_data, variables) => {
      useDivisionScheduleStore.getState().replaceEquipoId(variables.divisionId, variables.equipoActualId, variables.equipoNuevoId)

      const divisionKeys = [
        ["division-equipos", variables.divisionId],
        ["jornadas", variables.divisionId],
        ["jornadas-infinitas", variables.divisionId],
        ["last-jornada", variables.divisionId],
        ["tabla-posiciones", variables.divisionId],
        ["rondas-playoff", variables.divisionId],
        ["goleadores", variables.divisionId],
        divisionCampeonKey(variables.divisionId),
        historialCampeonesKey(variables.divisionId),
      ] as const
      for (const queryKey of divisionKeys) {
        qc.invalidateQueries({ queryKey, exact: true })
      }
      for (const equipoId of [variables.equipoActualId, variables.equipoNuevoId]) {
        qc.invalidateQueries({ queryKey: ["division-equipos", "equipo", equipoId], exact: true, refetchType: "none" })
        qc.invalidateQueries({ queryKey: campeonatosEquipoKey(equipoId), exact: true, refetchType: "none" })
      }
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
