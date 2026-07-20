import { api } from "@/infrastructure/api/client"

export interface PartidoResponse {
  id: string
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  fecha: string | null
  fechaFin: string | null
  estado: string | null
  llave: number | null
  rondaPlayoffId: string | null
  tipoPartido?: string
  jornadaId: string | null
  equipoLocalId: string | null
  equipoVisitanteId: string | null
  canchaId: string | null
  equipoLocal?: { id: string; nombre: string; logo: string | null }
  equipoVisitante?: { id: string; nombre: string; logo: string | null }
  cancha?: { id: string; nombre: string } | null
}

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export const partidoApi = {
  getById: (id: string) =>
    api.get<ApiRes<PartidoResponse>>(`/api/partidos/${id}`).then((r) => r.data.data!),
  findByRondaPlayoff: (rondaPlayoffId: string) =>
    api.get<ApiRes<PartidoResponse[]>>(`/api/partidos/ronda-playoff/${rondaPlayoffId}`).then((r) => r.data.data!),
  update: (id: string, data: { golesLocal?: number; golesVisitante?: number; penalesLocal?: number | null; penalesVisitante?: number | null; estado?: string; tipoPartido?: string }) =>
    api.patch<ApiRes<PartidoResponse>>(`/api/partidos/${id}`, data).then((r) => r.data.data!),
  createRefereeLink: (partidoId: string) =>
    api.post<ApiRes<{ token: string; url: string }>>(`/api/partidos/${partidoId}/referee-link`).then((r) => r.data.data!),
  revokeRefereeLink: (partidoId: string) =>
    api.delete<ApiRes<undefined>>(`/api/partidos/${partidoId}/referee-link`).then((r) => r.data),
}

export interface RefereePartidoResponse {
  id: string
  fecha: string | null
  horaInicio: string | null
  equipoLocal: { id: string; nombre: string; logo: string | null } | null
  equipoVisitante: { id: string; nombre: string; logo: string | null } | null
  cancha: { id: string; nombre: string } | null
  estado: string | null
  golesLocal: number
  golesVisitante: number
  penalesLocal: number | null
  penalesVisitante: number | null
  jornadaNumero: number | null
  divisionNombre: string
  ligaNombre: string
}

export const refereeApi = {
  getPartido: (token: string) =>
    api.get<ApiRes<RefereePartidoResponse>>(`/api/referee/partidos/${token}`).then((r) => r.data.data!),
  updateResult: (token: string, data: { golesLocal: number; golesVisitante: number; penalesLocal?: number | null; penalesVisitante?: number | null; estado: string }) =>
    api.patch<ApiRes<{ id: string; golesLocal: number; golesVisitante: number; penalesLocal: number | null; penalesVisitante: number | null; estado: string }>>(`/api/referee/partidos/${token}/result`, data).then((r) => r.data.data!),
}
