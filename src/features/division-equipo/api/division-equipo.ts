import { api } from "@/infrastructure/api/client"
import type { Division } from "@/domain/interfaces/league"

export interface DivisionEquipoLink {
  divisionId: string
  equipoId: string
  saldoPendiente?: string
  division?: Division
}

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export const divisionEquipoApi = {
  findByDivision: (divisionId: string) =>
    api.get<ApiRes<DivisionEquipoLink[]>>(`/api/divisiones-equipos/division/${divisionId}`).then((r) => r.data.data!),
  findByEquipo: (equipoId: string) =>
    api.get<ApiRes<DivisionEquipoLink[]>>(`/api/divisiones-equipos/equipo/${equipoId}`).then((r) => r.data.data!),
  create: (data: { divisionId: string; equipoId: string }) =>
    api.post<ApiRes<DivisionEquipoLink>>("/api/divisiones-equipos", data).then((r) => r.data.data!),
  remove: (divisionId: string, equipoId: string) =>
    api.delete(`/api/divisiones-equipos/${divisionId}/${equipoId}`),
  updateSaldo: (divisionId: string, equipoId: string, saldoPendiente: string) =>
    api.patch<ApiRes<DivisionEquipoLink>>(`/api/divisiones-equipos/${divisionId}/${equipoId}`, { saldoPendiente }).then((r) => r.data.data!),
}
