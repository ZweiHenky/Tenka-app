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

function buildQuery(p: LigaFilterParams): string {
  let q = `page=${p.page}&limit=${p.limit}`
  if (p.search) q += `&search=${encodeURIComponent(p.search)}`
  if (p.categoriaId) q += `&categoriaId=${p.categoriaId}`
  if (p.tipoId) q += `&tipoId=${p.tipoId}`
  if (p.estadoLigaId) q += `&estadoLigaId=${p.estadoLigaId}`
  return q
}

export const leagueApi = {
  list: (userId?: string) =>
    api.get<ApiRes<League[]>>(`/api/ligas${userId ? `?userId=${userId}` : ""}`).then((r) => r.data.data!),

  listPaginated: (params: LigaFilterParams) =>
    api.get<ApiRes<PaginatedResponse<League>>>(`/api/ligas?${buildQuery(params)}`).then((r) => ({ ...r.data.data!, page: params.page, limit: params.limit })),

  getById: (id: string) => api.get<ApiRes<League>>(`/api/ligas/${id}`).then((r) => r.data.data!),

  create: (data: CreateLeagueInput) =>
    api.post<ApiRes<League>>("/api/ligas", data).then((r) => r.data.data!),

  update: (id: string, data: Partial<CreateLeagueInput>) =>
    api.patch<ApiRes<League>>(`/api/ligas/${id}`, data).then((r) => r.data.data!),

  delete: (id: string) => api.delete(`/api/ligas/${id}`),
}
