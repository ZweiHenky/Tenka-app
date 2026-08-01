import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { partidoApi } from "../api/partidos"

export function usePartido(id: string) {
  return useQuery({
    queryKey: ["partido", id],
    queryFn: () => partidoApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 15,
  })
}

export function useUpdatePartido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, divisionId: _divisionId, ...data }: { id: string; golesLocal?: number; golesVisitante?: number; penalesLocal?: number | null; penalesVisitante?: number | null; estado?: string; divisionId?: string; tipoPartido?: string; equipoLocalId?: string; equipoVisitanteId?: string }) =>
      partidoApi.update(id, data),
    onSuccess: (partido, { id, divisionId }) => {
      queryClient.invalidateQueries({ queryKey: ["partido"] })
      queryClient.invalidateQueries({ queryKey: ["jornada"] })
      if (divisionId) {
        queryClient.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] })
      }
      queryClient.invalidateQueries({ queryKey: ["referee-candidates"] })
    },
  })
}

export function useCreateRefereeLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (partidoId: string) => partidoApi.createRefereeLink(partidoId),
    onSuccess: (_, partidoId) => {
      queryClient.invalidateQueries({ queryKey: ["referee-link-status", partidoId] })
    },
  })
}

export function useRevokeRefereeLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (partidoId: string) => partidoApi.revokeRefereeLink(partidoId),
    onSuccess: (_, partidoId) => {
      queryClient.invalidateQueries({ queryKey: ["referee-link-status", partidoId] })
    },
  })
}

export function useRefereeLinkStatus(partidoId: string) {
  return useQuery({
    queryKey: ["referee-link-status", partidoId],
    queryFn: () => partidoApi.getRefereeLinkStatus(partidoId),
    enabled: !!partidoId,
    refetchInterval: 30000,
  })
}
