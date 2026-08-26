import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { partidoApi } from "../api/partidos"
import type { CreateJornadaPartidoInput, PartidoResponse, UpdateResultInput } from "../api/partidos"
import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import type { JornadaPage, JornadaResponse, PartidoResponse as JornadaPartidoResponse } from "@/features/jornada/api/jornadas"
import { patchPartidoInInfinite, patchPartidoInJornadas, upsertPartidoInJornada } from "@/features/jornada/jornadaCache"
import { accountQuotaKey } from "@/features/users/quota"

interface PreviousPartido {
  estado: string | null
  tipoPartido?: PartidoResponse["tipoPartido"]
  jornadaId: string | null
  rondaPlayoffId: string | null
}

function patchPartidoInJornadaCaches(queryClient: QueryClient, divisionId: string, partido: PartidoResponse) {
  const projection = partido as JornadaPartidoResponse
  if (partido.jornadaId) {
    queryClient.setQueryData<JornadaResponse>(["jornada", partido.jornadaId], (current) => current ? upsertPartidoInJornada(current, projection) : current)
  }
  queryClient.setQueryData<JornadaResponse[]>(["jornadas", divisionId], (current) => patchPartidoInJornadas(current, projection))
  queryClient.setQueryData<InfiniteData<JornadaPage>>(["jornadas-infinitas", divisionId], (current) => patchPartidoInInfinite(current, projection))
  queryClient.setQueryData<JornadaResponse | null>(["last-jornada", divisionId], (current) => current ? upsertPartidoInJornada(current, projection) : current)
}

function refetchMissingJornadaCaches(queryClient: QueryClient, divisionId: string, jornadaId?: string | null) {
  const keys: unknown[][] = [["jornadas", divisionId], ["jornadas-infinitas", divisionId], ["last-jornada", divisionId]]
  if (jornadaId) keys.push(["jornada", jornadaId])
  for (const queryKey of keys) {
    if (queryClient.getQueryData(queryKey) === undefined) queryClient.invalidateQueries({ queryKey, exact: true })
  }
}

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
    mutationFn: ({ id, divisionId: _divisionId, leagueId: _leagueId, previous: _previous, ...data }: { id: string; golesLocal?: number; golesVisitante?: number; penalesLocal?: number | null; penalesVisitante?: number | null; estado?: string; divisionId?: string; leagueId?: string; previous?: PreviousPartido; tipoPartido?: string; equipoLocalId?: string; equipoVisitanteId?: string }) =>
      partidoApi.update(id, data),
    onSuccess: async (partido, { id, divisionId, leagueId, previous }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["partido", id], exact: true }),
        ...(previous?.jornadaId ? [queryClient.cancelQueries({ queryKey: ["jornada", previous.jornadaId], exact: true })] : []),
        ...(divisionId ? [
          queryClient.cancelQueries({ queryKey: ["jornadas", divisionId], exact: true }),
          queryClient.cancelQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true }),
          queryClient.cancelQueries({ queryKey: ["last-jornada", divisionId], exact: true }),
        ] : []),
      ])
      queryClient.setQueryData<PartidoResponse>(["partido", id], (current) => current ? { ...current, ...partido } : partido)
      queryClient.invalidateQueries({ queryKey: ["partido"], predicate: (query) => query.queryKey[1] !== id })
      queryClient.invalidateQueries({ queryKey: ["jornada"] })
      const jornadaId = previous?.jornadaId ?? partido.jornadaId
      if (jornadaId) {
        queryClient.invalidateQueries({ queryKey: ["jornada-partido-options", jornadaId], exact: true })
      }
      if (divisionId) {
        queryClient.invalidateQueries({ queryKey: ["jornadas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
        queryClient.invalidateQueries({ queryKey: ["last-jornada", divisionId], exact: true })
      }
      if (leagueId) queryClient.invalidateQueries({ queryKey: ["referee-candidates", leagueId], exact: true })
      queryClient.invalidateQueries({ queryKey: accountQuotaKey })
    },
  })
}

export function useUpdatePartidoResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, divisionId: _divisionId, leagueId: _leagueId, previous: _previous, ...data }: UpdateResultInput & { id: string; divisionId?: string; leagueId?: string; previous?: PreviousPartido }) => partidoApi.updateResult(id, data),
    onSuccess: async (partido, { id, divisionId, leagueId, previous, estado }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["partido", id], exact: true }),
        ...(previous?.jornadaId ? [queryClient.cancelQueries({ queryKey: ["jornada", previous.jornadaId], exact: true })] : []),
        ...(divisionId ? [
          queryClient.cancelQueries({ queryKey: ["jornadas", divisionId], exact: true }),
          queryClient.cancelQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true }),
          queryClient.cancelQueries({ queryKey: ["last-jornada", divisionId], exact: true }),
        ] : []),
      ])
      const cached = queryClient.getQueryData<PartidoResponse>(["partido", id])
      const before = previous ?? cached
      queryClient.setQueryData<PartidoResponse>(["partido", id], (current) => current ? { ...current, ...partido } : partido)
      if (divisionId) {
        patchPartidoInJornadaCaches(queryClient, divisionId, partido)
        refetchMissingJornadaCaches(queryClient, divisionId, partido.jornadaId)
        const tipoPartido = before?.tipoPartido ?? partido.tipoPartido
        const touchesFinal = !before || before.estado === "FINALIZADO" || estado === "FINALIZADO"
        if (touchesFinal && tipoPartido !== "AMISTOSO") {
          if ((before?.jornadaId ?? partido.jornadaId) && !(before?.rondaPlayoffId ?? partido.rondaPlayoffId)) {
            queryClient.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId], exact: true })
          }
          queryClient.invalidateQueries({ queryKey: ["goleadores", divisionId], exact: true })
        }
        if ((before?.rondaPlayoffId ?? partido.rondaPlayoffId)) {
          queryClient.invalidateQueries({ queryKey: ["rondas-playoff", divisionId], exact: true })
          queryClient.invalidateQueries({ queryKey: ["partido"], predicate: (query) => query.queryKey[1] !== id })
          queryClient.setQueryData<PartidoResponse>(["partido", id], (current) => current ? { ...current, ...partido } : partido)
        }
      }
      if (leagueId) queryClient.invalidateQueries({ queryKey: ["referee-candidates", leagueId], exact: true })
      queryClient.invalidateQueries({ queryKey: accountQuotaKey })
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
    mutationFn: ({ jornadaId, divisionId: _divisionId, leagueId: _leagueId, idempotencyKey, data }: { jornadaId: string; divisionId: string; leagueId?: string; idempotencyKey: string; data: CreateJornadaPartidoInput }) =>
      partidoApi.createInJornada(jornadaId, data, idempotencyKey),
    onSuccess: async (partido, { jornadaId, divisionId, leagueId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["jornada", jornadaId], exact: true }),
        queryClient.cancelQueries({ queryKey: ["jornadas", divisionId], exact: true }),
        queryClient.cancelQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true }),
        queryClient.cancelQueries({ queryKey: ["last-jornada", divisionId], exact: true }),
      ])
      patchPartidoInJornadaCaches(queryClient, divisionId, partido)
      refetchMissingJornadaCaches(queryClient, divisionId, jornadaId)
      queryClient.removeQueries({ queryKey: ["jornada-partido-options", jornadaId], exact: true })
      if (leagueId) {
        queryClient.invalidateQueries({ queryKey: ["court-availability", leagueId] })
        queryClient.invalidateQueries({ queryKey: ["referee-candidates", leagueId], exact: true })
      }
    },
  })
}

export function useCreateRefereeLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (partidoId: string) => partidoApi.createRefereeLink(partidoId),
    onSuccess: (link, partidoId) => {
      queryClient.setQueryData(["referee-link-status", partidoId], { exists: true, expiresAt: link.expiresAt })
    },
  })
}

export function useRevokeRefereeLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (partidoId: string) => partidoApi.revokeRefereeLink(partidoId),
    onSuccess: (_, partidoId) => {
      queryClient.setQueryData(["referee-link-status", partidoId], { exists: false, expiresAt: null })
    },
  })
}

const MAX_REFETCH_TIMEOUT_MS = 2_147_000_000

export function refereeLinkExpiryRefetchInterval(status: { exists: boolean; expiresAt: string | null } | undefined, now = Date.now()): number | false {
  if (!status?.exists || !status.expiresAt) return false
  const remaining = new Date(status.expiresAt).getTime() - now
  if (!Number.isFinite(remaining)) return false
  if (remaining <= 0) return 1_000
  return Math.min(remaining + 1_000, MAX_REFETCH_TIMEOUT_MS)
}

export function useRefereeLinkStatus(partidoId: string, enabled = true) {
  return useQuery({
    queryKey: ["referee-link-status", partidoId],
    queryFn: () => partidoApi.getRefereeLinkStatus(partidoId),
    enabled: enabled && !!partidoId,
    staleTime: 30_000,
    refetchInterval: (query) => refereeLinkExpiryRefetchInterval(query.state.data),
  })
}
