import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { jornadaApi, type JornadaPage, type JornadaResponse, type SlotInput } from "@/features/jornada/api/jornadas"
import { useDivisionScheduleStore } from "@/stores/divisionSchedule"
import type { InfiniteData } from "@tanstack/react-query"
import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import { insertGeneratedJornada, insertGeneratedJornadaInInfinite, removeJornadaFromInfinite } from "@/features/jornada/jornadaCache"

const KEY = "jornadas"

function removeDeletedQuery(qc: ReturnType<typeof useQueryClient>, queryKey: readonly unknown[]) {
  const query = qc.getQueryCache().find({ queryKey, exact: true })
  if (query?.isActive()) qc.invalidateQueries({ queryKey, exact: true })
  else qc.removeQueries({ queryKey, exact: true })
}

function refetchMissingQueries(qc: ReturnType<typeof useQueryClient>, queryKeys: readonly (readonly unknown[])[]) {
  for (const queryKey of queryKeys) {
    if (qc.getQueryData(queryKey) === undefined) qc.invalidateQueries({ queryKey, exact: true })
  }
}

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
    mutationFn: ({ divisionId, leagueId: _leagueId, slots, equipoIds, descansoEquipoId, idempotencyKey }: { divisionId: string; leagueId?: string; slots?: SlotInput[]; equipoIds?: string[]; descansoEquipoId?: string; idempotencyKey: string }) => jornadaApi.generateNext(divisionId, slots, equipoIds, descansoEquipoId, idempotencyKey),
    onSuccess: async (created, { divisionId, leagueId, slots }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: [KEY, divisionId], exact: true }),
        qc.cancelQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true }),
        qc.cancelQueries({ queryKey: ["last-jornada", divisionId], exact: true }),
      ])
      qc.setQueryData(["last-jornada", divisionId], created)
      try {
        const expanded = await jornadaApi.getById(created.id)
        qc.setQueryData(["jornada", expanded.id], expanded)
        qc.setQueryData<JornadaResponse[]>([KEY, divisionId], (current) => insertGeneratedJornada(current, expanded))
        qc.setQueryData<InfiniteData<JornadaPage>>(["jornadas-infinitas", divisionId], (current) => insertGeneratedJornadaInInfinite(current, expanded))
        qc.setQueryData(["last-jornada", divisionId], expanded)
      } catch {
        qc.invalidateQueries({ queryKey: [KEY, divisionId], exact: true })
        qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true })
        qc.invalidateQueries({ queryKey: ["last-jornada", divisionId], exact: true })
      }
      refetchMissingQueries(qc, [[KEY, divisionId], ["jornadas-infinitas", divisionId], ["last-jornada", divisionId]])
      const generatedPlayoffIds = new Set(slots?.filter((slot) => slot.tipo === "eliminatoria" && slot.partidoId).map((slot) => slot.partidoId!) ?? [])
      if (generatedPlayoffIds.size > 0) {
        qc.setQueryData<RondaPlayoff[]>(["rondas-playoff", divisionId], (current) => current?.map((round) => ({
          ...round,
          partidos: round.partidos.map((partido) => generatedPlayoffIds.has(partido.id)
            ? { ...partido, jornadaId: created.id }
            : partido),
        })))
        qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId], exact: true })
      }
      if (leagueId) qc.invalidateQueries({ queryKey: ["court-availability", leagueId] })
      if (leagueId) qc.invalidateQueries({ queryKey: ["referee-candidates", leagueId], exact: true })
    },
  })
}

export function useDeleteJornada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, divisionId }: { id: string; divisionId: string; leagueId?: string }) => jornadaApi.delete(id),
    onSuccess: async (_, { id, divisionId, leagueId }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: [KEY, divisionId], exact: true }),
        qc.cancelQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true }),
        qc.cancelQueries({ queryKey: ["last-jornada", divisionId], exact: true }),
        qc.cancelQueries({ queryKey: ["jornada", id], exact: true }),
      ])
      const finite = qc.getQueryData<JornadaResponse[]>([KEY, divisionId])
      const infinite = qc.getQueryData<InfiniteData<JornadaPage>>(["jornadas-infinitas", divisionId])
      const detail = qc.getQueryData<JornadaResponse>(["jornada", id])
      const deleted = detail ?? finite?.find((jornada) => jornada.id === id) ?? infinite?.pages.flatMap((page) => page.rows).find((jornada) => jornada.id === id)
      for (const partido of deleted?.partidos ?? []) {
        removeDeletedQuery(qc, ["partido", partido.id])
        removeDeletedQuery(qc, ["referee-link-status", partido.id])
      }
      removeDeletedQuery(qc, ["jornada", id])
      removeDeletedQuery(qc, ["jornada-partido-options", id])

      const finiteRemaining = finite?.filter((jornada) => jornada.id !== id)
      if (finite) {
        qc.setQueryData([KEY, divisionId], finiteRemaining)
        if (finite.length >= 10) qc.invalidateQueries({ queryKey: [KEY, divisionId], exact: true })
      }
      const infiniteRemaining = removeJornadaFromInfinite(infinite, id)
      if (infiniteRemaining === null) {
        qc.setQueryData<InfiniteData<JornadaPage>>(["jornadas-infinitas", divisionId], (current) => current ? {
          ...current,
          pages: current.pages.map((page) => ({ ...page, rows: page.rows.filter((jornada) => jornada.id !== id) })),
        } : current)
        qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId], exact: true })
      }
      else if (infiniteRemaining) qc.setQueryData(["jornadas-infinitas", divisionId], infiniteRemaining)

      const remaining = finiteRemaining?.[0] ?? infiniteRemaining?.pages.flatMap((page) => page.rows)[0]
      if (remaining || finite?.length === 1 || infinite?.pages[0]?.total === 1) {
        qc.setQueryData(["last-jornada", divisionId], remaining ?? null)
        useDivisionScheduleStore.getState().syncSchedule(divisionId, remaining?.fechaInicio)
      } else {
        qc.invalidateQueries({ queryKey: ["last-jornada", divisionId], exact: true })
      }
      refetchMissingQueries(qc, [[KEY, divisionId], ["jornadas-infinitas", divisionId], ["last-jornada", divisionId]])

      qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId], exact: true })
      qc.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId], exact: true })
      qc.invalidateQueries({ queryKey: ["goleadores", divisionId], exact: true })
      if (leagueId) {
        qc.invalidateQueries({ queryKey: ["court-availability", leagueId] })
        qc.invalidateQueries({ queryKey: ["referee-candidates", leagueId], exact: true })
        qc.invalidateQueries({ queryKey: ["referee-batches", leagueId], exact: true })
      }
    },
  })
}
