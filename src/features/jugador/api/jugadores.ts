import { api } from "@/infrastructure/api/client"
import { withNetworkRetry } from "@/infrastructure/api/withNetworkRetry"
import type { BuscarJugadorEquipoResult, CreateJugadorInput, DivisionJugador, DivisionJugadorConRel, EquipoJugador, Jugador, PosicionJugador, UpdateJugadorInput, UpdateMyProfileInput } from "@/domain/interfaces/player"

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

interface PaginatedResponse<T> {
  rows: T[]
  total: number
}

export const jugadorApi = {
  getMe: () =>
    api.get<ApiRes<Jugador | null>>("/api/jugadores/me").then((r) => r.data.data ?? null),

  createMe: (data: { nombre: string; posicion: PosicionJugador; photoAssetId?: string | null; edad?: number }) =>
    api.post<ApiRes<Jugador>>("/api/jugadores/me", data).then((r) => r.data.data!),


  updateMe: (data: UpdateMyProfileInput) =>
    api.patch<ApiRes<Jugador>>("/api/jugadores/me", data).then((r) => r.data.data!),


  list: (equipoId?: string) =>
    equipoId
      ? api.get<ApiRes<Jugador[]>>(`/api/jugadores?equipoId=${equipoId}`).then((r) => r.data.data!)
      : api.get<ApiRes<PaginatedResponse<Jugador>>>("/api/jugadores?page=1&limit=100").then((r) => r.data.data!.rows),


  search: (search: string) =>
    api.get<ApiRes<PaginatedResponse<Jugador>>>(`/api/jugadores?search=${encodeURIComponent(search)}&page=1&limit=50`).then((r) => r.data.data!.rows),


  getById: (id: string) =>
    api.get<ApiRes<Jugador>>(`/api/jugadores/${id}`).then((r) => r.data.data!),


  create: (data: CreateJugadorInput) =>
    api.post<ApiRes<Jugador>>("/api/jugadores", data).then((r) => r.data.data!),


  update: (id: string, data: UpdateJugadorInput) =>
    api.patch<ApiRes<Jugador>>(`/api/jugadores/${id}`, data).then((r) => r.data.data!),


  delete: (id: string) => api.delete(`/api/jugadores/${id}`),


  assignToTeam: (data: { equipoId: string; jugadorId: string; dorsal: number }) =>
    withNetworkRetry(() =>
      api.post<ApiRes<EquipoJugador>>("/api/jugadores/equipo", data).then((r) => r.data.data!),
    ),

  findForTeam: (equipoId: string, telefono: string) =>
    withNetworkRetry(() =>
      api.post<ApiRes<BuscarJugadorEquipoResult>>(`/api/jugadores/equipo/${equipoId}/buscar`, { telefono }).then((r) => r.data.data!),
    ),


  removeFromTeam: (equipoId: string, jugadorId: string) =>
    api.delete(`/api/jugadores/equipo/${equipoId}/${jugadorId}`),


  listByDivisionTeam: (divisionId: string, equipoId: string) =>
    api.get<ApiRes<DivisionJugador[]>>(`/api/jugadores/division/${divisionId}/equipo/${equipoId}`).then((r) => r.data.data!),


  assignToDivision: (data: { divisionId: string; equipoId: string; jugadorId: string }) =>
    api.post<ApiRes<DivisionJugador>>("/api/jugadores/division", data).then((r) => r.data.data!),


  listDivisionsByPlayer: (jugadorId: string) =>
    api.get<ApiRes<DivisionJugadorConRel[]>>(`/api/jugadores/${jugadorId}/divisiones`).then((r) => r.data.data!),


  removeFromDivision: (divisionId: string, equipoId: string, jugadorId: string) =>
    api.delete(`/api/jugadores/division/${divisionId}/${equipoId}/${jugadorId}`),
}
