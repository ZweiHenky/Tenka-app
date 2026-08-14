import { api } from "@/infrastructure/api/client"

export interface EquipoResponse {
  id: string
  nombre: string
  logo: string | null
  codigo: string
  esPropio: boolean
}

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

interface PaginatedResponse<T> {
  rows: T[]
  total: number
}

async function listAllTeams(): Promise<EquipoResponse[]> {
  const rows: EquipoResponse[] = []
  let page = 1
  while (true) {
    const result = await api.get<ApiRes<PaginatedResponse<EquipoResponse>>>(`/api/equipos?page=${page}&limit=100`).then((r) => r.data.data!)
    rows.push(...result.rows)
    if (rows.length >= result.total || result.rows.length === 0) return rows
    page += 1
  }
}

export const teamApi = {
  list: (userId?: string) =>
    userId
      ? api.get<ApiRes<EquipoResponse[]>>(`/api/equipos?userId=${userId}`).then((r) => r.data.data!)
      : listAllTeams(),
  getById: (id: string) =>
    api.get<ApiRes<EquipoResponse>>(`/api/equipos/${id}`).then((r) => r.data.data!),
  create: (data: { nombre: string; logoAssetId?: string | null }) =>
    api.post<ApiRes<EquipoResponse>>("/api/equipos", data).then((r) => r.data.data!),
  update: (id: string, data: { nombre?: string; logoAssetId?: string | null }) =>
    api.patch<ApiRes<EquipoResponse>>(`/api/equipos/${id}`, data).then((r) => r.data.data!),
  delete: (id: string) => api.delete(`/api/equipos/${id}`),
}
