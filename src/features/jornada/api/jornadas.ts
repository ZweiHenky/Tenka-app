import { api } from "@/infrastructure/api/client"
import type { PartidoAnotacion, PartidoParticipacion } from "@/features/partido/scoring"

export interface JornadaResponse {
  id: string
  numero: number
  fechaInicio: string | null
  fechaFin: string | null
  divisionId: string
  partidos?: PartidoResponse[]
}

export interface PartidoResponse {
  id: string
  version?: number
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
  anotaciones?: PartidoAnotacion[]
  participaciones?: PartidoParticipacion[]
}

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export interface SlotInput {
  fecha: string
  horaInicio: string
  horaFin: string
  equipoLocalId?: string
  equipoVisitanteId?: string
  tipo?: 'regular' | 'complemento' | 'amistoso' | 'eliminatoria'
  canchaId?: string
  partidoId?: string
}

export interface PaginatedResponse<T> {
  rows: T[]
  total: number
}

export type JornadaPage = PaginatedResponse<JornadaResponse> & { page: number; limit: number }

export const jornadaApi = {
  listByDivision: (divisionId: string) =>
    api.get<ApiRes<PaginatedResponse<JornadaResponse>>>(`/api/jornadas/division/${divisionId}`).then((r) => r.data.data!.rows),
  listByDivisionPaginated: (divisionId: string, page: number, limit: number) =>
    api.get<ApiRes<PaginatedResponse<JornadaResponse>>>(`/api/jornadas/division/${divisionId}?page=${page}&limit=${limit}`).then((r) => ({ ...r.data.data!, page, limit })),
  getById: (id: string) =>
    api.get<ApiRes<JornadaResponse>>(`/api/jornadas/${id}`).then((r) => r.data.data!),
  generateNext: (divisionId: string, slots: SlotInput[] | undefined, equipoIds: string[] | undefined, descansoEquipoId: string | undefined, idempotencyKey: string) =>
    api.post<ApiRes<JornadaResponse>>(
      `/api/jornadas/generate-next/${divisionId}`,
      { slots, equipoIds, descansoEquipoId },
      { headers: { "Idempotency-Key": idempotencyKey } },
    ).then((r) => r.data.data!),
  delete: (id: string) =>
    api.delete<ApiRes<undefined>>(`/api/jornadas/${id}`).then((r) => r.data),
}
