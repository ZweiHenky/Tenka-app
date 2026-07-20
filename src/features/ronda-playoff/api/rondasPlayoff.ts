import { api } from "@/infrastructure/api/client"

interface ApiRes<T> {
  success: boolean
  data?: T
}

export interface RondaPlayoff {
  id: string
  nombre: string
  orden: number
  divisionId: string
  createdAt: string
  updatedAt: string
}

export const rondaPlayoffApi = {
  listByDivision: (divisionId: string) =>
    api.get<ApiRes<RondaPlayoff[]>>(`/api/rondas-playoff/division/${divisionId}`).then((r) => r.data.data!),
  create: (data: { nombre: string; orden: number; divisionId: string }) =>
    api.post<ApiRes<RondaPlayoff>>("/api/rondas-playoff", data).then((r) => r.data.data!),
  generate: (data: { divisionId: string; cantidadEquipos: number }) =>
    api.post<ApiRes<RondaPlayoff[]>>("/api/rondas-playoff/generate", data).then((r) => r.data.data!),
  deleteByDivision: (divisionId: string) =>
    api.delete<ApiRes<undefined>>(`/api/rondas-playoff/division/${divisionId}`).then((r) => r.data),
}
