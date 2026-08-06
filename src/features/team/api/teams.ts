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

export const teamApi = {
  list: (userId?: string) =>
    api.get<ApiRes<EquipoResponse[]>>(`/api/equipos${userId ? `?userId=${userId}` : ''}`).then((r) => r.data.data!),
  getById: (id: string) =>
    api.get<ApiRes<EquipoResponse>>(`/api/equipos/${id}`).then((r) => r.data.data!),
  create: (data: { nombre: string; logoAssetId?: string | null }) =>
    api.post<ApiRes<EquipoResponse>>("/api/equipos", data).then((r) => r.data.data!),
  update: (id: string, data: { nombre?: string; logoAssetId?: string | null }) =>
    api.patch<ApiRes<EquipoResponse>>(`/api/equipos/${id}`, data).then((r) => r.data.data!),
  delete: (id: string) => api.delete(`/api/equipos/${id}`),
}
