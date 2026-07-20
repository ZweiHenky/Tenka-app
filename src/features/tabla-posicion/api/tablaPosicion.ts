import { api } from "@/infrastructure/api/client"

export interface TablaPosicionRow {
  id: string
  partidosJugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferenciaGoles: number
  puntos: number
  divisionId: string
  equipoId: string
  equipo?: { id: string; nombre: string; logo: string | null }
}

interface ApiRes<T> {
  success: boolean
  data?: T
}

export const tablaPosicionApi = {
  listByDivision: (divisionId: string) =>
    api.get<ApiRes<TablaPosicionRow[]>>(`/api/tabla-posiciones/division/${divisionId}`).then((r) => r.data.data!),
}
