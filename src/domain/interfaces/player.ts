export type PosicionJugador = "PORTERO" | "DEFENSA" | "LATERAL" | "CONTENCION" | "MEDIO" | "EXTREMO" | "DELANTERO"

export const POSICIONES_JUGADOR: { id: PosicionJugador; nombre: string }[] = [
  { id: "PORTERO", nombre: "Portero" },
  { id: "DEFENSA", nombre: "Defensa" },
  { id: "LATERAL", nombre: "Lateral" },
  { id: "CONTENCION", nombre: "Contención" },
  { id: "MEDIO", nombre: "Medio" },
  { id: "EXTREMO", nombre: "Extremo" },
  { id: "DELANTERO", nombre: "Delantero" },
]

export interface Jugador {
  id: string
  nombre: string
  posicion: PosicionJugador
  foto: string | null
  fotoPublicId: string | null
  edad: number | null
  telefono: string | null
  showPhoneInPublicProfile: boolean
  createdAt: string
  updatedAt: string
  equipos?: EquipoJugador[]
}

export interface EquipoJugador {
  equipoId: string
  jugadorId: string
  dorsal: number
  createdAt: string
  jugador?: Jugador
  equipo?: { id: string; nombre: string; logo: string | null }
}

export interface DivisionJugador {
  divisionId: string
  equipoId: string
  jugadorId: string
  createdAt: string
  jugador: Jugador
}

export interface DivisionJugadorConRel {
  divisionId: string
  equipoId: string
  jugadorId: string
  createdAt: string
  division: {
    id: string
    nombre: string
    liga: { id: string; nombre: string; logo: string | null } | null
    estadoLiga: { id: string; nombre: string } | null
  }
  equipo: { id: string; nombre: string; logo: string | null }
}

export interface CreateJugadorInput {
  nombre: string
  posicion: PosicionJugador
  foto?: string
  fotoPublicId?: string
  edad?: number
  telefono?: string
  equipoId: string
  dorsal: number
}

export interface UpdateJugadorInput {
  nombre?: string
  posicion?: PosicionJugador
  foto?: string | null
  fotoPublicId?: string | null
  edad?: number | null
  telefono?: string | null
  equipoId?: string
  dorsal?: number
}
