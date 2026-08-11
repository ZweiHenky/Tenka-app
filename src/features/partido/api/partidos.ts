import { api } from "@/infrastructure/api/client"
import type { PartidoAnotacion, PartidoParticipacion, ParticipacionInput, ResultAnnotationInput, ScorerCandidate } from "../scoring"

export interface PartidoResponse {
  id: string
  version: number
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  fecha: string | null
  fechaFin: string | null
  estado: string | null
  llave: number | null
  rondaPlayoffId: string | null
  tipoPartido?: 'REGULAR' | 'AMISTOSO' | 'COMPLEMENTO' | 'ELIMINATORIA'
  exhibicionLocal?: boolean
  exhibicionVisitante?: boolean
  notas?: string | null
  jornadaId: string | null
  equipoLocalId: string | null
  equipoVisitanteId: string | null
  canchaId: string | null
  equipoLocal?: { id: string; nombre: string; logo: string | null }
  equipoVisitante?: { id: string; nombre: string; logo: string | null }
  cancha?: { id: string; nombre: string } | null
  arbitros?: { id: string; nombre: string }[]
  jornadasRecalculadas?: number
  anotaciones: PartidoAnotacion[]
  participaciones?: PartidoParticipacion[]
}

export interface UpdateResultInput {
  expectedVersion: number
  estado: string
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  allocations: ResultAnnotationInput[]
  participaciones?: ParticipacionInput[]
  notas?: string | null
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
  update: (id: string, data: { golesLocal?: number; golesVisitante?: number; penalesLocal?: number | null; penalesVisitante?: number | null; estado?: string; tipoPartido?: string; equipoLocalId?: string; equipoVisitanteId?: string }) =>
    api.patch<ApiRes<PartidoResponse>>(`/api/partidos/${id}`, data).then((r) => r.data.data!),
  updateResult: (id: string, data: UpdateResultInput) =>
    api.patch<ApiRes<PartidoResponse>>(`/api/partidos/${id}/resultado`, data).then((r) => r.data.data!),
  createRefereeLink: (partidoId: string) =>
    api.post<ApiRes<{ token: string; url: string; expiresAt: string }>>(`/api/partidos/${partidoId}/referee-link`).then((r) => r.data.data!),
  revokeRefereeLink: (partidoId: string) =>
    api.delete<ApiRes<undefined>>(`/api/partidos/${partidoId}/referee-link`).then((r) => r.data),
  getRefereeLinkStatus: (partidoId: string) =>
    api.get<ApiRes<{ exists: boolean; expiresAt: string | null }>>(`/api/partidos/${partidoId}/referee-link-status`).then((r) => r.data.data!),
}

export interface RefereePartidoResponse {
  id: string
  version: number
  fecha: string | null
  fechaFin: string | null
  horaInicio: string | null
  equipoLocal: { id: string; nombre: string; logo: string | null } | null
  equipoVisitante: { id: string; nombre: string; logo: string | null } | null
  cancha: { id: string; nombre: string } | null
  canchaId: string | null
  multiplesCanchas: boolean
  estado: string | null
  golesLocal: number
  golesVisitante: number
  penalesLocal: number | null
  penalesVisitante: number | null
  tipoPartido: 'REGULAR' | 'AMISTOSO' | 'COMPLEMENTO' | 'ELIMINATORIA'
  notas?: string | null
  jornadaNumero: number | null
  divisionNombre: string
  ligaNombre: string
  anotaciones: PartidoAnotacion[]
  participaciones: PartidoParticipacion[]
  registrarParticipaciones: boolean
  usarPenalesEnEmpates: boolean
  jugadoresLocal: ScorerCandidate[]
  jugadoresVisitante: ScorerCandidate[]
}

function refereeApiClient(token: string) {
  const headers = { Authorization: `Bearer ${token}` }
  return {
    getPartido: () =>
      api.get<ApiRes<RefereePartidoResponse>>(`/api/referee/partido`, { headers }).then((r) => r.data.data!),
    updateResult: (data: UpdateResultInput) =>
      api.patch<ApiRes<{ id: string; golesLocal: number; golesVisitante: number; penalesLocal: number | null; penalesVisitante: number | null; estado: string; notas?: string | null }>>(`/api/referee/partido/result`, data, { headers }).then((r) => r.data.data!),
  }
}

export { refereeApiClient }
