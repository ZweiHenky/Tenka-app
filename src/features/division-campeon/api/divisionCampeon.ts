import { api } from "@/infrastructure/api/client"

interface ApiRes<T> {
  success: boolean
  data?: T
}

export interface DivisionCampeon {
  id: string
  divisionId: string
  equipoId: string | null
  equipoNombre: string
  equipoLogo: string | null
  jugadorId: string | null
  jugadorNombre: string | null
  jugadorFoto: string | null
  jugadorGoles: number | null
  createdAt: string
  updatedAt: string
}

/**
 * Una división ganada, para el palmarés del equipo.
 *
 * Los datos de la división vienen de snapshots del servidor, no de una relación: la división pudo
 * borrarse y el título sigue siendo legible.
 */
export interface CampeonatoEquipo {
  id: string
  divisionId: string | null
  /** Cuándo se coronó: es la fecha que se muestra en el logro. */
  createdAt: string
  divisionNombre: string
  ligaId: string | null
  ligaNombre: string
  ligaLogo: string | null
}

/** Un título de goleo, para el palmarés de un jugador. */
export interface CampeonatoJugador {
  id: string
  divisionId: string | null
  createdAt: string
  divisionNombre: string
  ligaId: string | null
  ligaNombre: string
  ligaLogo: string | null
  jugadorGoles: number | null
}

/** Un título anterior de una división. */
export interface CampeonHistorial {
  id: string
  createdAt: string
  archivadoEn: string | null
  equipoId: string | null
  equipoNombre: string
  equipoLogo: string | null
}

export interface AsignarCampeonInput {
  equipoId: string
  jugadorId?: string | null
}

export const divisionCampeonApi = {
  getByDivision: (divisionId: string) =>
    api.get<ApiRes<DivisionCampeon | null>>(`/api/campeones/division/${divisionId}`).then((r) => r.data.data ?? null),
  // No se puede derivar de la lista de divisiones del equipo: esa sale del pivote de inscripción,
  // y al sacar al equipo de la división desaparece — pero el campeonato sobrevive.
  listByEquipo: (equipoId: string) =>
    api.get<ApiRes<CampeonatoEquipo[]>>(`/api/campeones/equipo/${equipoId}`).then((r) => r.data.data ?? []),
  listByJugador: (jugadorId: string) =>
    api.get<ApiRes<CampeonatoJugador[]>>(`/api/campeones/jugador/${jugadorId}`).then((r) => r.data.data ?? []),
  listHistorialByDivision: (divisionId: string) =>
    api.get<ApiRes<CampeonHistorial[]>>(`/api/campeones/division/${divisionId}/historial`).then((r) => r.data.data ?? []),
  // Idempotente: el servidor actualiza el título vigente de la división o lo crea si no hay.
  assign: (divisionId: string, data: AsignarCampeonInput) =>
    api.put<ApiRes<DivisionCampeon>>(`/api/campeones/division/${divisionId}`, data).then((r) => r.data.data!),
  remove: (divisionId: string) => api.delete(`/api/campeones/division/${divisionId}`),
}
