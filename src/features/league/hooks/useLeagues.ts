import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { leagueApi } from "@/features/league/api/leagues"
import type { CreateLeagueInput, League } from "@/domain/interfaces/league"
import { committed, notCommitted, withAmbiguousWriteRecovery } from "@/infrastructure/api/ambiguous-write"

const KEY = "leagues"
type UserLeagueListItem = Pick<League, "id" | "nombre" | "logo">

function markPublicLeagueListsStale(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ["ligas-infinitas"], refetchType: "none" })
}

function leagueUpdateMatches(current: League, before: League | undefined, data: Partial<CreateLeagueInput>): boolean {
  if (data.nombre !== undefined && current.nombre !== data.nombre.trim()) return false
  if (data.descripcion !== undefined && current.descripcion !== data.descripcion) return false
  if (data.ubicacionId !== undefined && current.ubicacionId !== data.ubicacionId) return false
  if (data.multiplesCanchas !== undefined && current.multiplesCanchas !== data.multiplesCanchas) return false
  if (data.usaArbitros !== undefined && current.usaArbitros !== data.usaArbitros) return false
  if (data.logoAssetId !== undefined) {
    if (data.logoAssetId === null ? current.logo !== null : !current.logo || current.logo === before?.logo) return false
  }
  if (data.coverAssetId !== undefined) {
    if (data.coverAssetId === null ? current.cancha !== null : !current.cancha || current.cancha === before?.cancha) return false
  }
  if (data.reglas !== undefined && JSON.stringify(current.reglas ?? []) !== JSON.stringify(data.reglas)) return false
  if (data.arbitros !== undefined) {
    const currentNames = (current.arbitros ?? []).map((entry) => entry.nombre).sort()
    const desiredNames = data.arbitros.map((entry) => entry.nombre).sort()
    if (JSON.stringify(currentNames) !== JSON.stringify(desiredNames)) return false
  }
  if (data.canchas !== undefined) {
    const currentCourts = (current.canchas ?? []).map((court) => ({ nombre: court.nombre, activa: court.activa })).sort((a, b) => a.nombre.localeCompare(b.nombre))
    const desiredCourts = data.canchas.map((court) => ({ nombre: (court.nombre ?? "").trim(), activa: court.activa ?? true })).sort((a, b) => a.nombre.localeCompare(b.nombre))
    if (JSON.stringify(currentCourts) !== JSON.stringify(desiredCourts)) return false
  }
  return true
}

export function useUserLeagues(userId: string) {
  return useQuery({
    queryKey: [KEY, "user", userId],
    queryFn: () => leagueApi.listByUser(userId),
    enabled: !!userId,
  })
}

export function useLeague(id: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => leagueApi.getById(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateLeague(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLeagueInput) => withAmbiguousWriteRecovery(
      () => leagueApi.create(data),
      async () => {
        const leagues = await leagueApi.listByUser(userId)
        const league = leagues.find((entry) => entry.nombre.trim().toLowerCase() === data.nombre.trim().toLowerCase())
        if (!league) return notCommitted()
        return committed(await leagueApi.getById(league.id))
      },
    ),
    onSuccess: (league) => {
      const item: UserLeagueListItem = { id: league.id, nombre: league.nombre, logo: league.logo }
      qc.setQueryData<UserLeagueListItem[]>([KEY, "user", league.userId], (current) =>
        current && !current.some((entry) => entry.id === item.id) ? [...current, item] : current,
      )
      markPublicLeagueListsStale(qc)
    },
  })
}

export function useUpdateLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeagueInput> }) => {
      const before = qc.getQueryData<League>([KEY, id])
      return withAmbiguousWriteRecovery(
        () => leagueApi.update(id, data),
        async () => {
          const league = await leagueApi.getById(id)
          return leagueUpdateMatches(league, before, data) ? committed(league) : notCommitted()
        },
      )
    },
    onSuccess: (league) => {
      qc.setQueryData([KEY, league.id], league)
      qc.setQueryData<UserLeagueListItem[]>([KEY, "user", league.userId], (current) =>
        current?.map((entry) => entry.id === league.id ? { id: league.id, nombre: league.nombre, logo: league.logo } : entry),
      )
      markPublicLeagueListsStale(qc)
    },
  })
}

export function useDeleteLeague(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmName }: { id: string; confirmName?: string }) => leagueApi.delete(id, confirmName),
    onSuccess: (_data, { id }) => {
      qc.removeQueries({ queryKey: [KEY, id], exact: true })
      qc.setQueryData<UserLeagueListItem[]>([KEY, "user", userId], (current) => current?.filter((entry) => entry.id !== id))
      markPublicLeagueListsStale(qc)
    },
  })
}
