import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { jugadorApi } from "@/features/jugador/api/jugadores"
import type { CreateJugadorInput, DivisionJugador, DivisionJugadorConRel, EquipoJugador, Jugador, PosicionJugador, UpdateJugadorInput, UpdateMyProfileInput } from "@/domain/interfaces/player"
import type { QueryClient } from "@tanstack/react-query"
import { committed, notCommitted, withAmbiguousWriteRecovery } from "@/infrastructure/api/ambiguous-write"

const KEY = "jugadores"

function publicJugador(player: Jugador): Jugador {
  const copy = { ...player } as Jugador & { userId?: unknown; fotoPublicId?: unknown }
  delete copy.userId
  delete copy.fotoPublicId
  copy.telefono = copy.showPhoneInPublicProfile ? copy.telefono : null
  return copy
}

function sortJugadores(players: Jugador[]): Jugador[] {
  return [...players].sort((a, b) => a.nombre.localeCompare(b.nombre) || a.id.localeCompare(b.id))
}

function replacePublicPlayerCopies(qc: QueryClient, player: Jugador) {
  const publicPlayer = publicJugador(player)
  qc.setQueryData([KEY, player.id], publicPlayer)
  qc.setQueriesData<Jugador[]>({ queryKey: [KEY, "equipo"] }, (current) => current ? sortJugadores(current.map((entry) => entry.id === player.id ? publicPlayer : entry)) : current)
  qc.setQueriesData<DivisionJugador[]>({ queryKey: [KEY, "division"] }, (current) => current ? [...current.map((entry) => entry.jugadorId === player.id ? { ...entry, jugador: { ...entry.jugador, ...publicPlayer } } : entry)].sort((a, b) => a.jugador.nombre.localeCompare(b.jugador.nombre) || a.jugadorId.localeCompare(b.jugadorId)) : current)
  qc.setQueriesData<Jugador[]>({ queryKey: [KEY, "search"] }, (current) => current ? sortJugadores(current.map((entry) => entry.id === player.id ? publicPlayer : entry)) : current)
  qc.setQueryData<Jugador | null>([KEY, "me"], (current) => current?.id === player.id ? player : current)
}

function removeTeamMembership(player: Jugador, equipoId: string): Jugador {
  return { ...player, equipos: player.equipos?.filter((membership) => membership.equipoId !== equipoId) }
}

function upsertTeamMembership(player: Jugador, membership: EquipoJugador): Jugador {
  return {
    ...player,
    equipos: [...(player.equipos?.filter((entry) => entry.equipoId !== membership.equipoId) ?? []), membership],
  }
}

async function cancelPlayerQueries(qc: QueryClient) {
  await qc.cancelQueries({ queryKey: [KEY] })
}

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
    mutationFn: (data: { nombre: string; posicion: PosicionJugador; photoAssetId?: string | null; edad?: number }) =>
      withAmbiguousWriteRecovery(
        () => jugadorApi.createMe(data),
        async () => {
          const profile = await jugadorApi.getMe()
          return profile ? committed(profile) : notCommitted()
        },
      ),
    onSuccess: async (profile) => {
      await cancelPlayerQueries(qc)
      qc.setQueryData([KEY, "me"], profile)
      replacePublicPlayerCopies(qc, profile)
      qc.invalidateQueries({ queryKey: [KEY, "search"] })
      qc.invalidateQueries({ queryKey: ["goleadores"], refetchType: "none" })
    },
  })
}

export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateMyProfileInput) =>
      jugadorApi.updateMe(data),
    onSuccess: async (profile, input) => {
      await cancelPlayerQueries(qc)
      qc.setQueryData([KEY, "me"], profile)
      replacePublicPlayerCopies(qc, profile)
      if (input.nombre !== undefined) qc.invalidateQueries({ queryKey: [KEY, "search"] })
      if (input.nombre !== undefined || input.photoAssetId !== undefined) qc.invalidateQueries({ queryKey: ["goleadores"], refetchType: "none" })
    },
  })
}

export function useJugadores(equipoId?: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, "equipo", equipoId],
    queryFn: () => jugadorApi.list(equipoId),
    enabled: enabled && !!equipoId,
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
    mutationFn: (data: CreateJugadorInput) => withAmbiguousWriteRecovery(
      () => jugadorApi.create(data),
      async () => {
        const players = await jugadorApi.list(data.equipoId)
        const player = players.find((entry) => entry.nombre.trim().toLowerCase() === data.nombre.trim().toLowerCase()
          && entry.equipos?.some((membership) => membership.equipoId === data.equipoId && membership.dorsal === data.dorsal))
        return player ? committed(player) : notCommitted()
      },
    ),
    onSuccess: async (player, vars) => {
      await cancelPlayerQueries(qc)
      const publicPlayer = publicJugador(player)
      qc.setQueryData<Jugador[]>([KEY, "equipo", vars.equipoId], (current) => sortJugadores([
        ...(current?.filter((entry) => entry.id !== player.id) ?? []),
        publicPlayer,
      ]))
      replacePublicPlayerCopies(qc, player)
      qc.setQueriesData<DivisionJugador[]>({ queryKey: [KEY, "division"] }, (current) => current?.map((entry) => entry.jugadorId === player.id && entry.equipoId === vars.equipoId ? { ...entry, dorsal: vars.dorsal, jugador: publicPlayer } : entry))
      qc.setQueryData<DivisionJugadorConRel[]>(["jugador", "divisiones", player.id], (current) => current?.map((entry) => entry.equipoId === vars.equipoId ? { ...entry, dorsal: vars.dorsal } : entry))
      qc.invalidateQueries({ queryKey: [KEY, "search"] })
    },
  })
}

export function useAssignJugadorToTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: jugadorApi.assignToTeam,
    onSuccess: async (membership, vars) => {
      await cancelPlayerQueries(qc)
      qc.invalidateQueries({ queryKey: [KEY, "equipo"] })
      qc.setQueriesData<DivisionJugador[]>({ queryKey: [KEY, "division"] }, (current) => current?.map((entry) => entry.jugadorId === vars.jugadorId && entry.equipoId === vars.equipoId ? { ...entry, dorsal: vars.dorsal, jugador: upsertTeamMembership(entry.jugador, membership) } : entry))
      qc.setQueryData<DivisionJugadorConRel[]>(["jugador", "divisiones", vars.jugadorId], (current) => current?.map((entry) => entry.equipoId === vars.equipoId ? { ...entry, dorsal: vars.dorsal } : entry))
      qc.invalidateQueries({ queryKey: [KEY, vars.jugadorId], exact: true })
      qc.invalidateQueries({ queryKey: [KEY, "search"] })
      const me = qc.getQueryData<Jugador | null>([KEY, "me"])
      if (me?.id === vars.jugadorId) qc.invalidateQueries({ queryKey: [KEY, "me"], exact: true })
    },
  })
}

export function useBuscarJugadorParaEquipo() {
  return useMutation({
    mutationFn: ({ equipoId, telefono }: { equipoId: string; telefono: string }) =>
      jugadorApi.findForTeam(equipoId, telefono),
  })
}

export function useUpdateJugador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJugadorInput }) => jugadorApi.update(id, data),
    onSuccess: async (player, vars) => {
      await cancelPlayerQueries(qc)
      replacePublicPlayerCopies(qc, player)
      if (vars.data.equipoId && vars.data.dorsal !== undefined) {
        qc.setQueriesData<DivisionJugador[]>({ queryKey: [KEY, "division"] }, (current) => current?.map((entry) => entry.jugadorId === player.id && entry.equipoId === vars.data.equipoId ? { ...entry, dorsal: vars.data.dorsal!, jugador: publicJugador(player) } : entry))
        qc.setQueryData<DivisionJugadorConRel[]>(["jugador", "divisiones", player.id], (current) => current?.map((entry) => entry.equipoId === vars.data.equipoId ? { ...entry, dorsal: vars.data.dorsal! } : entry))
      }
      if (vars.data.nombre !== undefined || vars.data.telefono !== undefined) qc.invalidateQueries({ queryKey: [KEY, "search"] })
      if (vars.data.nombre !== undefined || vars.data.photoAssetId !== undefined) qc.invalidateQueries({ queryKey: ["goleadores"], refetchType: "none" })
    },
  })
}

export function useDeleteJugador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; equipoId: string }) => jugadorApi.delete(id),
    onSuccess: async (_, vars) => {
      await cancelPlayerQueries(qc)
      qc.removeQueries({ queryKey: [KEY, vars.id], exact: true })
      qc.removeQueries({ queryKey: ["jugador", "divisiones", vars.id], exact: true })
      qc.setQueriesData<Jugador[]>({ queryKey: [KEY, "equipo"] }, (current) => current?.filter((entry) => entry.id !== vars.id))
      qc.setQueriesData<Jugador[]>({ queryKey: [KEY, "search"] }, (current) => current?.filter((entry) => entry.id !== vars.id))
      qc.setQueriesData<DivisionJugador[]>({ queryKey: [KEY, "division"] }, (current) => current?.filter((entry) => entry.jugadorId !== vars.id))
      qc.setQueryData<Jugador | null>([KEY, "me"], (current) => current?.id === vars.id ? null : current)
      qc.invalidateQueries({ queryKey: ["goleadores"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["partido"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["jornada"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["jornadas"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["jornadas-infinitas"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["rondas-playoff"], refetchType: "none" })
    },
  })
}

export function useRemoveJugadorFromTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ equipoId, jugadorId }: { equipoId: string; jugadorId: string }) =>
      jugadorApi.removeFromTeam(equipoId, jugadorId),
    onSuccess: async (_, vars) => {
      await cancelPlayerQueries(qc)
      qc.setQueryData<Jugador[]>([KEY, "equipo", vars.equipoId], (current) => current?.filter((entry) => entry.id !== vars.jugadorId))
      qc.setQueriesData<Jugador[]>({ queryKey: [KEY, "equipo"] }, (current) => current?.map((entry) => entry.id === vars.jugadorId ? removeTeamMembership(entry, vars.equipoId) : entry))
      qc.setQueriesData<Jugador[]>({ queryKey: [KEY, "search"] }, (current) => current?.map((entry) => entry.id === vars.jugadorId ? removeTeamMembership(entry, vars.equipoId) : entry))
      qc.setQueriesData<DivisionJugador[]>({ queryKey: [KEY, "division"] }, (current) => current?.map((entry) => entry.jugadorId === vars.jugadorId ? { ...entry, jugador: removeTeamMembership(entry.jugador, vars.equipoId) } : entry))
      qc.setQueryData<Jugador>([KEY, vars.jugadorId], (current) => current ? removeTeamMembership(current, vars.equipoId) : current)
      qc.setQueryData<Jugador | null>([KEY, "me"], (current) => current?.id === vars.jugadorId ? removeTeamMembership(current, vars.equipoId) : current)
    },
  })
}

export function useAssignJugadorToDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { divisionId: string; equipoId: string; jugadorId: string }) => withAmbiguousWriteRecovery(
      () => jugadorApi.assignToDivision(data),
      async () => {
        const roster = await jugadorApi.listByDivisionTeam(data.divisionId, data.equipoId)
        const link = roster.find((entry) => entry.jugadorId === data.jugadorId)
        return link ? committed(link) : notCommitted()
      },
    ),
    onSuccess: async (link, vars) => {
      await cancelPlayerQueries(qc)
      qc.setQueryData<DivisionJugador[]>([KEY, "division", vars.divisionId, vars.equipoId], (current) => [
        ...(current?.filter((entry) => entry.jugadorId !== vars.jugadorId) ?? []),
        link,
      ].sort((a, b) => a.jugador.nombre.localeCompare(b.jugador.nombre) || a.jugadorId.localeCompare(b.jugadorId)))
      qc.invalidateQueries({ queryKey: ["jugador", "divisiones", vars.jugadorId], exact: true })
    },
  })
}

export function useRemoveJugadorFromDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, equipoId, jugadorId }: { divisionId: string; equipoId: string; jugadorId: string }) =>
      jugadorApi.removeFromDivision(divisionId, equipoId, jugadorId),
    onSuccess: async (_, vars) => {
      await cancelPlayerQueries(qc)
      qc.setQueryData<DivisionJugador[]>([KEY, "division", vars.divisionId, vars.equipoId], (current) => current?.filter((entry) => entry.jugadorId !== vars.jugadorId))
      qc.setQueryData<DivisionJugadorConRel[]>(["jugador", "divisiones", vars.jugadorId], (current) => current?.filter((entry) => entry.divisionId !== vars.divisionId || entry.equipoId !== vars.equipoId))
    },
  })
}
