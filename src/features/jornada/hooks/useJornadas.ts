import { Alert } from "react-native"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { jornadaApi, type SlotInput } from "@/features/jornada/api/jornadas"

const KEY = "jornadas"

export function useJornadas(divisionId: string) {
  return useQuery({
    queryKey: [KEY, divisionId],
    queryFn: () => jornadaApi.listByDivision(divisionId),
    enabled: !!divisionId,
  })
}

export function useGenerateNextJornada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, slots, equipoIds, descansoEquipoId }: { divisionId: string; slots?: SlotInput[]; equipoIds?: string[]; descansoEquipoId?: string }) => jornadaApi.generateNext(divisionId, slots, equipoIds, descansoEquipoId),
    onSuccess: (_, { divisionId }) => {
      qc.invalidateQueries({ queryKey: [KEY, divisionId] })
      qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
      qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] })
    },
  })
}

export function useDeleteJornada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, divisionId }: { id: string; divisionId: string }) => jornadaApi.delete(id),
    onSuccess: (_, { divisionId }) => {
      qc.invalidateQueries({ queryKey: [KEY, divisionId] })
      qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
      qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] })
      qc.invalidateQueries({ queryKey: ["partidos-ultima-ronda"] })
    },
  })
}
