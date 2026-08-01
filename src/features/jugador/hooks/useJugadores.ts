import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { jugadorApi } from "@/features/jugador/api/jugadores"
import type { CreateJugadorInput, PosicionJugador, UpdateJugadorInput, UpdateMyProfileInput } from "@/domain/interfaces/player"

const KEY = "jugadores"

export function useMyProfile(enabled = true) {
  return useQuery({
    queryKey: [KEY, "me"],
    queryFn: () => jugadorApi.getMe(),
    staleTime: 1000 * 60 * 2,
    retry: false,
    enabled,
  })
}

export function useCreateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; posicion: PosicionJugador; foto?: string; fotoPublicId?: string; edad?: number }) =>
      jugadorApi.createMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "me"] }),
  })
}

export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateMyProfileInput) =>
      jugadorApi.updateMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "me"] }),
  })
}

export function useJugadores(equipoId?: string) {
  return useQuery({
    queryKey: [KEY, "equipo", equipoId],
    queryFn: () => jugadorApi.list(equipoId),
    enabled: !!equipoId,
  })
}

export function useJugador(id?: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => jugadorApi.getById(id!),
    enabled: !!id,
  })
}

export function useSearchJugadores(search: string) {
  return useQuery({
    queryKey: [KEY, "search", search],
    queryFn: () => jugadorApi.search(search),
    enabled: search.trim().length >= 2,
  })
}

export function useDivisionJugadores(divisionId?: string, equipoId?: string) {
  return useQuery({
    queryKey: [KEY, "division", divisionId, equipoId],
    queryFn: () => jugadorApi.listByDivisionTeam(divisionId!, equipoId!),
    enabled: !!divisionId && !!equipoId,
  })
}

export function useCreateJugador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateJugadorInput) => jugadorApi.create(data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, "equipo", vars.equipoId] }),
  })
}

export function useAssignJugadorToTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: jugadorApi.assignToTeam,
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, "equipo", vars.equipoId] }),
  })
}

export function useUpdateJugador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJugadorInput }) => jugadorApi.update(id, data),
    onSuccess: (_, vars) => {
      if (vars.data.equipoId) qc.invalidateQueries({ queryKey: [KEY, "equipo", vars.data.equipoId] })
    },
  })
}

export function useDeleteJugador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; equipoId: string }) => jugadorApi.delete(id),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, "equipo", vars.equipoId] }),
  })
}

export function useRemoveJugadorFromTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ equipoId, jugadorId }: { equipoId: string; jugadorId: string }) =>
      jugadorApi.removeFromTeam(equipoId, jugadorId),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, "equipo", vars.equipoId] }),
  })
}

export function useAssignJugadorToDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: jugadorApi.assignToDivision,
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, "division", vars.divisionId, vars.equipoId] }),
  })
}

export function useRemoveJugadorFromDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, equipoId, jugadorId }: { divisionId: string; equipoId: string; jugadorId: string }) =>
      jugadorApi.removeFromDivision(divisionId, equipoId, jugadorId),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, "division", vars.divisionId, vars.equipoId] }),
  })
}
