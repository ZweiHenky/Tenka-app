import { api } from "@/infrastructure/api/client"

export interface GoleadorRow {
  rank: number
  /**
   * `null` cuando el jugador ya no existe: la fila sobrevive por el snapshot del nombre y sale
   * como "Jugador eliminado". No hay perfil al que ir ni campeonato que otorgarle.
   */
  jugadorId: string | null
  nombre: string
  foto: string | null
  goles: number
  /** `equipoId` es `null` por lo mismo: el equipo se borró y solo queda su nombre. */
  equipos: { equipoId: string | null; nombre: string; goles: number }[]
}

export interface GoleadoresResponse {
  rows: GoleadorRow[]
  unattributedGoals: number
}

export const goleadoresApi = {
  listByDivision: (divisionId: string) => api.get<{ success: boolean; data: GoleadoresResponse }>(`/api/goleadores/division/${divisionId}`).then((response) => response.data.data),
}
