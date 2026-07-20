import { api } from "@/infrastructure/api/client"

export interface EquipoResponse {
  id: string
  nombre: string
  logo: string | null
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
  create: (data: { nombre: string; logo?: string; logoPublicId?: string }) =>
    api.post<ApiRes<EquipoResponse>>("/api/equipos", data).then((r) => r.data.data!),
  update: (id: string, data: { nombre?: string; logo?: string; logoPublicId?: string }) =>
    api.patch<ApiRes<EquipoResponse>>(`/api/equipos/${id}`, data).then((r) => r.data.data!),
  delete: (id: string) => api.delete(`/api/equipos/${id}`),
}
