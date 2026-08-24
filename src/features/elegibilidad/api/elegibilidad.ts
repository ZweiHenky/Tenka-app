import { api } from "@/infrastructure/api/client"

export interface FilaElegibilidad {
  jugadorId: string
  nombre: string
  equipoId: string | null
  equipoNombre: string | null
  partidosJugados: number
  elegible: boolean
}

export interface ElegibilidadResponse {
  /** Partidos exigidos para alinear en eliminatorias. 0 = sin requisito. */
  minimo: number
  rows: FilaElegibilidad[]
}

export const elegibilidadApi = {
  listByDivision: (divisionId: string) =>
    api.get<{ success: boolean; data: ElegibilidadResponse }>(`/api/elegibilidad/division/${divisionId}`)
      .then((response) => response.data.data),
}
