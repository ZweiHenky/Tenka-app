import { api } from "@/infrastructure/api/client"

export interface GoleadorRow {
  rank: number
  jugadorId: string
  nombre: string
  foto: string | null
  goles: number
  equipos: { equipoId: string; nombre: string; goles: number }[]
}

export interface GoleadoresResponse {
  rows: GoleadorRow[]
  unattributedGoals: number
}

export const goleadoresApi = {
  listByDivision: (divisionId: string) => api.get<{ success: boolean; data: GoleadoresResponse }>(`/api/goleadores/division/${divisionId}`).then((response) => response.data.data),
}
