import { api } from "@/infrastructure/api/client"
import type { PartidoAnotacion, PartidoParticipacion, ParticipacionInput, ResultAnnotationInput, ScorerCandidate } from "../scoring"
import { committed, notCommitted, withAmbiguousWriteRecovery } from "@/infrastructure/api/ambiguous-write"

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
  timeZone?: string
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

export interface UpdatePartidoInput {
  golesLocal?: number
  golesVisitante?: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  estado?: string
  tipoPartido?: string
  equipoLocalId?: string
  equipoVisitanteId?: string
}

export interface JornadaPartidoTeamOption {
  id: string
  nombre: string
  pendiente: boolean
}

export interface JornadaPartidoSlotOption {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  canchaId: string | null
  canchaNombre: string | null
  equiposOcupados: string[]
  canchaDisponible: boolean
}

export interface JornadaPartidoOptions {
  equipos: JornadaPartidoTeamOption[]
  pendientes: JornadaPartidoTeamOption[]
  recomendacion: "REGULAR" | "COMPLEMENTO" | "MANUAL"
  localSugeridoId: string | null
  visitanteSugeridoId: string | null
  slots: JornadaPartidoSlotOption[]
}

export interface CreateJornadaPartidoInput {
  equipoLocalId: string
  equipoVisitanteId: string
  tipoPartido: "REGULAR" | "COMPLEMENTO"
  fecha: string
  horaInicio: string
  horaFin: string
  canchaId: string | null
}

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

const getPartidoById = (id: string) =>
  api.get<ApiRes<PartidoResponse>>(`/api/partidos/${id}`).then((response) => response.data.data!)

function normalizedAllocations(allocations: { ladoMarcador: string; jugadorId: string | null; cantidad: number }[]): string {
  return JSON.stringify(allocations
    .filter((allocation) => allocation.jugadorId)
    .map((allocation) => `${allocation.ladoMarcador}:${allocation.jugadorId}:${allocation.cantidad}`)
    .sort())
}

function resultMatches(partido: PartidoResponse, input: UpdateResultInput): boolean {
  if (partido.version <= input.expectedVersion || partido.estado !== input.estado) return false
  if (input.estado === "SUSPENDIDO") return true
  const golesLocal = input.estado === "PROGRAMADO" ? 0 : input.golesLocal
  const golesVisitante = input.estado === "PROGRAMADO" ? 0 : input.golesVisitante
  const penalesLocal = input.estado === "PROGRAMADO" ? null : input.penalesLocal ?? null
  const penalesVisitante = input.estado === "PROGRAMADO" ? null : input.penalesVisitante ?? null
  if (partido.golesLocal !== golesLocal || partido.golesVisitante !== golesVisitante) return false
  if ((partido.penalesLocal ?? null) !== penalesLocal || (partido.penalesVisitante ?? null) !== penalesVisitante) return false
  if (input.notas !== undefined && (partido.notas ?? null) !== input.notas) return false
  if (input.estado === "FINALIZADO" && normalizedAllocations(partido.anotaciones ?? []) !== normalizedAllocations(input.allocations)) return false
  return true
}

function updateMatches(partido: PartidoResponse, data: UpdatePartidoInput): boolean {
  return (data.equipoLocalId === undefined || partido.equipoLocalId === data.equipoLocalId)
    && (data.equipoVisitanteId === undefined || partido.equipoVisitanteId === data.equipoVisitanteId)
    && (data.tipoPartido === undefined || partido.tipoPartido === data.tipoPartido)
    && (data.estado === undefined || partido.estado === data.estado)
    && (data.golesLocal === undefined || partido.golesLocal === data.golesLocal)
    && (data.golesVisitante === undefined || partido.golesVisitante === data.golesVisitante)
}

export const partidoApi = {
  getById: getPartidoById,
  findByRondaPlayoff: (rondaPlayoffId: string) =>
    api.get<ApiRes<PartidoResponse[]>>(`/api/partidos/ronda-playoff/${rondaPlayoffId}`).then((r) => r.data.data!),
  getJornadaCreationOptions: (jornadaId: string) =>
    api.get<ApiRes<JornadaPartidoOptions>>(`/api/partidos/jornada/${jornadaId}/creation-options`).then((r) => r.data.data!),
  createInJornada: (jornadaId: string, data: CreateJornadaPartidoInput, idempotencyKey: string) =>
    api.post<ApiRes<PartidoResponse>>(`/api/partidos/jornada/${jornadaId}`, data, { headers: { "Idempotency-Key": idempotencyKey } }).then((r) => r.data.data!),
  update: (id: string, data: UpdatePartidoInput) =>
    withAmbiguousWriteRecovery(
      () => api.patch<ApiRes<PartidoResponse>>(`/api/partidos/${id}`, data).then((response) => response.data.data!),
      async () => {
        const partido = await getPartidoById(id)
        return updateMatches(partido, data) ? committed(partido) : notCommitted()
      },
    ),
  updateResult: (id: string, data: UpdateResultInput) =>
    withAmbiguousWriteRecovery(
      () => api.patch<ApiRes<PartidoResponse>>(`/api/partidos/${id}/resultado`, data).then((response) => response.data.data!),
      async () => {
        const partido = await getPartidoById(id)
        return resultMatches(partido, data) ? committed(partido) : notCommitted()
      },
    ),
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
