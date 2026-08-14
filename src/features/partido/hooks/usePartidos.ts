import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { partidoApi } from "../api/partidos"
import type { CreateJornadaPartidoInput, UpdateResultInput } from "../api/partidos"

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
        queryClient.invalidateQueries({ queryKey: ["jornadas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] })
      }
      queryClient.invalidateQueries({ queryKey: ["referee-candidates"] })
    },
  })
}

export function useUpdatePartidoResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, divisionId: _divisionId, ...data }: UpdateResultInput & { id: string; divisionId?: string }) => partidoApi.updateResult(id, data),
    onSuccess: (_, { id, divisionId }) => {
      queryClient.invalidateQueries({ queryKey: ["partido", id] })
      queryClient.invalidateQueries({ queryKey: ["jornada"] })
      queryClient.invalidateQueries({ queryKey: ["referee-candidates"] })
      if (divisionId) {
        queryClient.invalidateQueries({ queryKey: ["jornadas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["goleadores", divisionId] })
      }
    },
  })
}

export function useJornadaPartidoOptions(jornadaId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["jornada-partido-options", jornadaId],
    queryFn: () => partidoApi.getJornadaCreationOptions(jornadaId),
    enabled: enabled && !!jornadaId,
    staleTime: 0,
  })
}

export function useCreateJornadaPartido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jornadaId, divisionId: _divisionId, idempotencyKey, data }: { jornadaId: string; divisionId: string; idempotencyKey: string; data: CreateJornadaPartidoInput }) =>
      partidoApi.createInJornada(jornadaId, data, idempotencyKey),
    onSuccess: (_, { jornadaId, divisionId }) => {
      queryClient.invalidateQueries({ queryKey: ["jornada", jornadaId] })
      queryClient.invalidateQueries({ queryKey: ["jornada-partido-options", jornadaId] })
      queryClient.invalidateQueries({ queryKey: ["jornadas", divisionId] })
      queryClient.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
      queryClient.invalidateQueries({ queryKey: ["last-jornada", divisionId] })
      queryClient.invalidateQueries({ queryKey: ["court-availability"] })
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

export function useRefereeLinkStatus(partidoId: string, enabled = true) {
  return useQuery({
    queryKey: ["referee-link-status", partidoId],
    queryFn: () => partidoApi.getRefereeLinkStatus(partidoId),
    enabled: enabled && !!partidoId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const status = query.state.data
      if (!status?.exists || !status.expiresAt || new Date(status.expiresAt).getTime() <= Date.now()) return false
      return 30_000
    },
  })
}
