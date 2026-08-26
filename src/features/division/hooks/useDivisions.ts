import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { removeDeletedQuery } from "@/shared/utils/query-cache"
import { divisionCampeonKey, historialCampeonesKey } from "@/features/division-campeon/queryKeys"
import { divisionApi } from "@/features/division/api/divisions"
import type { CreateDivisionInput, Division } from "@/domain/interfaces/league"
import type { InfiniteData } from "@tanstack/react-query"
import type { JornadaPage, JornadaResponse } from "@/features/jornada/api/jornadas"
import { emptyJornadasInfinite } from "@/features/jornada/jornadaCache"
import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import type { GoleadoresResponse } from "@/features/goleador/api/goleadores"
import { useDivisionScheduleStore } from "@/stores/divisionSchedule"
import type { PartidoResponse } from "@/features/partido/api/partidos"
import { committed, notCommitted, withAmbiguousWriteRecovery } from "@/infrastructure/api/ambiguous-write"
import { divisionWriteCommitted } from "@/features/division/utils/division-write-check"
import { accountQuotaKey, refreshQuotaAfterError } from "@/features/users/quota"

export function useDivisions(ligaId: string, enabled = true) {
  return useQuery({
    queryKey: ["divisions", ligaId],
    queryFn: () => divisionApi.listByLiga(ligaId),
    enabled: enabled && !!ligaId,
  })
}

export function useDivision(divisionId: string, enabled = true) {
  return useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId),
    enabled: enabled && !!divisionId,
  })
}

export function useCreateDivision(ligaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDivisionInput) => withAmbiguousWriteRecovery(
      () => divisionApi.create(data),
      async () => {
        const divisions = await divisionApi.listByLiga(ligaId)
        const division = divisions.find((entry) => entry.nombre.trim().toLowerCase() === data.nombre.trim().toLowerCase()
          && entry.categoriaId === data.categoriaId
          && entry.tipoId === data.tipoId
          && entry.tipoCompetenciaId === data.tipoCompetenciaId
          && entry.maxEquipos === data.maxEquipos)
        return division ? committed(division) : notCommitted()
      },
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["divisions", ligaId] })
      qc.invalidateQueries({ queryKey: ["leagues", ligaId] })
      qc.invalidateQueries({ queryKey: accountQuotaKey })
    },
    onError: (error) => { refreshQuotaAfterError(qc, error) },
  })
}

export function useUpdateDivision(ligaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDivisionInput> }) => withAmbiguousWriteRecovery(
      () => divisionApi.update(id, data),
      async () => {
        const division = await divisionApi.getById(id)
        return divisionWriteCommitted(data, division) ? committed(division) : notCommitted()
      },
    ),
    onSuccess: (result, { id, data }) => {
      qc.setQueryData<Division>(["division", id], result)
      qc.invalidateQueries({ queryKey: ["divisions", ligaId] })
      qc.invalidateQueries({ queryKey: ["leagues", ligaId] })
      if (data.estadoLigaId !== undefined) qc.invalidateQueries({ queryKey: accountQuotaKey })
    },
    onError: (error) => { refreshQuotaAfterError(qc, error) },
  })
}

export function useDeleteDivision(ligaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmName }: { id: string; confirmName?: string }) => divisionApi.delete(id, confirmName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["divisions", ligaId] })
      qc.invalidateQueries({ queryKey: ["leagues", ligaId] })
      qc.invalidateQueries({ queryKey: accountQuotaKey })
    },
  })
}

export function useResetDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId }: { divisionId: string; leagueId: string }) => divisionApi.reset(divisionId),
    onSuccess: async (_, { divisionId, leagueId }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["jornadas", divisionId], exact: true }),
        qc.cancelQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true }),
        qc.cancelQueries({ queryKey: ["rondas-playoff", divisionId], exact: true }),
      ])
      const finite = qc.getQueryData<JornadaResponse[]>(["jornadas", divisionId]) ?? []
      const infinite = qc.getQueryData<InfiniteData<JornadaPage>>(["jornadas-infinitas", divisionId])
      const rounds = qc.getQueryData<RondaPlayoff[]>(["rondas-playoff", divisionId]) ?? []
      const cachedDetails = qc.getQueriesData<JornadaResponse>({ queryKey: ["jornada"] })
        .flatMap(([, jornada]) => jornada?.divisionId === divisionId ? [jornada] : [])
      const jornadas = [...finite, ...(infinite?.pages.flatMap((page) => page.rows) ?? []), ...cachedDetails]
      const jornadaIds = new Set(jornadas.map((jornada) => jornada.id))
      const roundIds = new Set(rounds.map((round) => round.id))
      const partidoIds = new Set([
        ...jornadas.flatMap((jornada) => jornada.partidos?.map((partido) => partido.id) ?? []),
        ...rounds.flatMap((round) => round.partidos.map((partido) => partido.id)),
        ...qc.getQueriesData<PartidoResponse>({ queryKey: ["partido"] }).flatMap(([, partido]) =>
          partido && (jornadaIds.has(partido.jornadaId ?? "") || roundIds.has(partido.rondaPlayoffId ?? "")) ? [partido.id] : []),
      ])
      for (const jornadaId of jornadaIds) {
        await qc.cancelQueries({ queryKey: ["jornada", jornadaId], exact: true })
        await qc.cancelQueries({ queryKey: ["jornada-partido-options", jornadaId], exact: true })
        removeDeletedQuery(qc, ["jornada", jornadaId])
        removeDeletedQuery(qc, ["jornada-partido-options", jornadaId])
      }
      for (const partidoId of partidoIds) {
        await qc.cancelQueries({ queryKey: ["partido", partidoId], exact: true })
        await qc.cancelQueries({ queryKey: ["referee-link-status", partidoId], exact: true })
        removeDeletedQuery(qc, ["partido", partidoId])
        removeDeletedQuery(qc, ["referee-link-status", partidoId])
      }
      qc.setQueryData(["jornadas", divisionId], [])
      qc.setQueryData(["jornadas-infinitas", divisionId], emptyJornadasInfinite())
      qc.setQueryData(["rondas-playoff", divisionId], [])
      qc.setQueryData(["last-jornada", divisionId], null)
      qc.setQueryData<GoleadoresResponse>(["goleadores", divisionId], { rows: [], unattributedGoals: 0 })
      qc.setQueryData(divisionCampeonKey(divisionId), null)
      qc.invalidateQueries({ queryKey: historialCampeonesKey(divisionId), exact: true })
      useDivisionScheduleStore.getState().resetSchedule(divisionId)
      qc.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId], exact: true })
      qc.invalidateQueries({ queryKey: ["court-availability", leagueId] })
      qc.invalidateQueries({ queryKey: ["referee-candidates", leagueId], exact: true })
      qc.invalidateQueries({ queryKey: ["referee-batches", leagueId], exact: true })
      qc.invalidateQueries({ queryKey: ["division", divisionId], exact: true })
      qc.invalidateQueries({ queryKey: ["divisions", leagueId], exact: true })
      qc.invalidateQueries({ queryKey: ["leagues", leagueId], exact: true })
      qc.invalidateQueries({ queryKey: ["ligas-infinitas"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: accountQuotaKey })
    },
    onError: (error) => { refreshQuotaAfterError(qc, error) },
  })
}
