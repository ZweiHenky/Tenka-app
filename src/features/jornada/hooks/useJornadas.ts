import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { jornadaApi, type SlotInput } from "@/features/jornada/api/jornadas"
import { useDivisionScheduleStore } from "@/stores/divisionSchedule"

const KEY = "jornadas"

export function useJornadas(divisionId: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, divisionId],
    queryFn: () => jornadaApi.listByDivision(divisionId),
    enabled: enabled && !!divisionId,
  })
}

export function useGenerateNextJornada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, slots, equipoIds, descansoEquipoId, idempotencyKey }: { divisionId: string; slots?: SlotInput[]; equipoIds?: string[]; descansoEquipoId?: string; idempotencyKey: string }) => jornadaApi.generateNext(divisionId, slots, equipoIds, descansoEquipoId, idempotencyKey),
    onSuccess: (_, { divisionId }) => {
      qc.invalidateQueries({ queryKey: [KEY, divisionId] })
      qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
      qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] })
      qc.invalidateQueries({ queryKey: ["referee-candidates"] })
    },
  })
}

export function useDeleteJornada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, divisionId }: { id: string; divisionId: string }) => jornadaApi.delete(id),
    onSuccess: async (_, { divisionId }) => {
      await qc.cancelQueries({ queryKey: ["last-jornada", divisionId] })
      qc.setQueryData(["last-jornada", divisionId], null)
      useDivisionScheduleStore.getState().syncSchedule(divisionId, null)
      let lastJornada = null
      try {
        const result = await jornadaApi.listByDivisionPaginated(divisionId, 1, 1)
        lastJornada = result.rows?.[0] ?? null
        qc.setQueryData(["last-jornada", divisionId], lastJornada)
        useDivisionScheduleStore.getState().syncSchedule(divisionId, lastJornada?.fechaInicio)
      } catch {
        qc.removeQueries({ queryKey: ["last-jornada", divisionId], exact: true })
      }
      qc.invalidateQueries({ queryKey: [KEY, divisionId] })
      qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
      qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] })
      qc.invalidateQueries({ queryKey: ["referee-candidates"] })
    },
  })
}
