import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { partidoApi, refereeApi } from "../api/partidos"

export function usePartido(id: string) {
  return useQuery({
    queryKey: ["partido", id],
    queryFn: () => partidoApi.getById(id),
    enabled: !!id,
  })
}

export function useUpdatePartido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; golesLocal: number; golesVisitante: number; penalesLocal?: number | null; penalesVisitante?: number | null; estado: string; divisionId?: string; tipoPartido?: string }) =>
      partidoApi.update(id, data),
    onSuccess: (partido, { id, divisionId }) => {
      queryClient.invalidateQueries({ queryKey: ["partido", id] })
      queryClient.invalidateQueries({ queryKey: ["jornada", partido.jornadaId] })
      if (divisionId) {
        queryClient.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] })
      }
      queryClient.invalidateQueries({ queryKey: ["partidos-ronda"] })
      queryClient.invalidateQueries({ queryKey: ["partidos-ultima-ronda"] })
    },
  })
}

export function useCreateRefereeLink() {
  return useMutation({
    mutationFn: (partidoId: string) => partidoApi.createRefereeLink(partidoId),
  })
}

export function useRevokeRefereeLink() {
  return useMutation({
    mutationFn: (partidoId: string) => partidoApi.revokeRefereeLink(partidoId),
  })
}

export function useRefereePartido(token: string) {
  return useQuery({
    queryKey: ["referee-partido", token],
    queryFn: () => refereeApi.getPartido(token),
    enabled: !!token,
    retry: false,
  })
}

export function useUpdateRefereeResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...data }: { token: string; golesLocal: number; golesVisitante: number; penalesLocal?: number | null; penalesVisitante?: number | null; estado: string }) =>
      refereeApi.updateResult(token, data),
    onSuccess: (_result, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["referee-partido", token] })
    },
  })
}
