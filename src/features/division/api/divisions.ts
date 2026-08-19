import { api } from "@/infrastructure/api/client"
import type { Division, CreateDivisionInput } from "@/domain/interfaces/league"

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export const divisionApi = {
  listByLiga: (ligaId: string) =>
    api.get<ApiRes<Division[]>>(`/api/divisiones/por-liga/${ligaId}`).then((r) => r.data.data!),
  getById: (id: string) =>
    api.get<ApiRes<Division>>(`/api/divisiones/${id}`).then((r) => r.data.data!),
  create: (data: CreateDivisionInput) =>
    api.post<ApiRes<Division>>("/api/divisiones", data).then((r) => r.data.data!),
  update: (id: string, data: Partial<CreateDivisionInput>) =>
    api.patch<ApiRes<Division>>(`/api/divisiones/${id}`, data).then((r) => r.data.data!),
  delete: (id: string, confirmName?: string) =>
    api.delete(`/api/divisiones/${id}`, confirmName ? { data: { confirmName } } : undefined),
  reset: (divisionId: string) => api.post<ApiRes<undefined>>(`/api/divisiones/${divisionId}/reset`).then((r) => r.data),
}
