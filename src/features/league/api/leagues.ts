import { api } from "@/infrastructure/api/client"
import type { League, CreateLeagueInput } from "@/domain/interfaces/league"

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

interface PaginatedResponse<T> {
  rows: T[]
  total: number
}

export interface LigaFilterParams {
  page: number
  limit: number
  search?: string
  categoriaId?: string
  tipoId?: string
  estadoLigaId?: string
}

export interface PublicLeagueListDto {
  id: string
  nombre: string
  descripcion: string
  logo: string | null
  cancha: string | null
  ubicacionId: string
  divisiones: {
    id: string
    nombre: string
    maxEquipos: number
    arbitraje: number
    diasPartido: string | null
    horarioPartido: string | null
    /** Configuración real por cancha; los escalares de arriba son solo su resumen (unión). */
    canchaHorarios?: { canchaId: string; diasPartido: string; horarioPartido: string; cancha: { nombre: string } }[]
    /**
     * Opcionales a propósito, aunque el servidor de hoy siempre los mande: la app se despliega por
     * separado del backend y se encuentra versiones más viejas —testing, un usuario que no
     * actualizó, un rollback—. Declararlos obligatorios hacía que un campo ausente tumbara la
     * pantalla con "Cannot read property 'nombre' of undefined", y TypeScript no podía avisar
     * porque el tipo prometía lo que el cable no garantiza.
     */
    categoria?: { id: string; nombre: string }
    tipo?: { id: string; nombre: string }
    tipoCompetencia?: { id: string; nombre: string }
    estadoLiga?: { id: string; nombre: string }
  }[]
}

export interface ProgramacionRecientePartidoDto {
  id: string
  fecha: string | null
  fechaFin: string | null
  cancha: { id: string; nombre: string } | null
  equipoLocal: { id: string; nombre: string; logo: string | null } | null
  equipoVisitante: { id: string; nombre: string; logo: string | null } | null
}

export interface ProgramacionRecienteJornadaDto {
  id: string
  numero: number
  fechaInicio: string | null
  fechaFin: string | null
  partidos: ProgramacionRecientePartidoDto[]
}

export interface ProgramacionRecienteDivisionDto {
  id: string
  nombre: string
  categoria: { id: string; nombre: string }
  jornadas: ProgramacionRecienteJornadaDto[]
}

export interface ProgramacionRecienteLigaDto {
  id: string
  nombre: string
  multiplesCanchas: boolean
  divisiones: ProgramacionRecienteDivisionDto[]
}

function buildQuery(p: LigaFilterParams): string {
  let q = `page=${p.page}&limit=${p.limit}`
  if (p.search) q += `&search=${encodeURIComponent(p.search)}`
  if (p.categoriaId) q += `&categoriaId=${p.categoriaId}`
  if (p.tipoId) q += `&tipoId=${p.tipoId}`
  if (p.estadoLigaId) q += `&estadoLigaId=${p.estadoLigaId}`
  return q
}

export const leagueApi = {
  listByUser: (userId: string) =>
    api.get<ApiRes<Pick<League, "id" | "nombre" | "logo">[]>>(`/api/ligas?userId=${userId}`).then((r) => r.data.data!),

  listPaginated: (params: LigaFilterParams) =>
    api.get<ApiRes<PaginatedResponse<PublicLeagueListDto>>>(`/api/ligas?${buildQuery(params)}`).then((r) => ({ ...r.data.data!, page: params.page, limit: params.limit })),

  getById: (id: string) => api.get<ApiRes<League>>(`/api/ligas/${id}`).then((r) => r.data.data!),

  getProgramacionReciente: (id: string) =>
    api.get<ApiRes<ProgramacionRecienteLigaDto>>(`/api/ligas/${id}/programacion-reciente`).then((r) => r.data.data!),

  create: (data: CreateLeagueInput) =>
    api.post<ApiRes<League>>("/api/ligas", data).then((r) => r.data.data!),

  update: (id: string, data: Partial<CreateLeagueInput>) =>
    api.patch<ApiRes<League>>(`/api/ligas/${id}`, data).then((r) => r.data.data!),

  delete: (id: string, confirmName?: string) =>
    api.delete(`/api/ligas/${id}`, confirmName ? { data: { confirmName } } : undefined),
}
