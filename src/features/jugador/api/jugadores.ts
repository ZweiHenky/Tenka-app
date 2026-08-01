import { api } from "@/infrastructure/api/client"
import type { CreateJugadorInput, DivisionJugador, DivisionJugadorConRel, EquipoJugador, Jugador, PosicionJugador, UpdateJugadorInput, UpdateMyProfileInput } from "@/domain/interfaces/player"

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export const jugadorApi = {
  getMe: () =>
    api.get<ApiRes<Jugador | null>>("/api/jugadores/me").then((r) => r.data.data ?? null),

  createMe: (data: { nombre: string; posicion: PosicionJugador; foto?: string; fotoPublicId?: string; edad?: number }) =>
    api.post<ApiRes<Jugador>>("/api/jugadores/me", data).then((r) => r.data.data!),


  updateMe: (data: UpdateMyProfileInput) =>
    api.patch<ApiRes<Jugador>>("/api/jugadores/me", data).then((r) => r.data.data!),


  list: (equipoId?: string) =>
    api.get<ApiRes<Jugador[]>>(`/api/jugadores${equipoId ? `?equipoId=${equipoId}` : ""}`).then((r) => r.data.data!),


  search: (search: string) =>
    api.get<ApiRes<Jugador[]>>(`/api/jugadores?search=${encodeURIComponent(search)}`).then((r) => r.data.data!),


  getById: (id: string) =>
    api.get<ApiRes<Jugador>>(`/api/jugadores/${id}`).then((r) => r.data.data!),


  create: (data: CreateJugadorInput) =>
    api.post<ApiRes<Jugador>>("/api/jugadores", data).then((r) => r.data.data!),


  update: (id: string, data: UpdateJugadorInput) =>
    api.patch<ApiRes<Jugador>>(`/api/jugadores/${id}`, data).then((r) => r.data.data!),


  delete: (id: string) => api.delete(`/api/jugadores/${id}`),


  assignToTeam: (data: { equipoId: string; jugadorId: string; dorsal: number }) =>
    api.post<ApiRes<EquipoJugador>>("/api/jugadores/equipo", data).then((r) => r.data.data!),


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
