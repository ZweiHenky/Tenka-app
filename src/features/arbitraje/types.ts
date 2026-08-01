export interface LeagueReferee {
  id: string
  nombre: string
  activo: boolean
}

export interface RefereeName {
  id: string
  nombre: string
}

export interface RefereeMatch {
  id: string
  fecha: string | null
  fechaFin: string | null
  equipoLocal: { id: string; nombre: string } | null
  equipoVisitante: { id: string; nombre: string } | null
  cancha: { id: string; nombre: string } | null
  jornada: { id: string; numero: number; division: { id: string; nombre: string } } | null
  rondaPlayoff: { id: string; nombre: string; division: { id: string; nombre: string } } | null
  arbitros: RefereeName[]
}

export interface RefereeCandidateGroup {
  id: string
  nombre?: string
  numero?: number
  orden?: number
  partidos: RefereeMatch[]
}

export interface RefereeCandidateDivision {
  id: string
  nombre: string
  jornadas: RefereeCandidateGroup[]
  rondasPlayoff: RefereeCandidateGroup[]
}

export interface RefereeBatchSummary {
  id: string
  nombre: string
  createdAt: string
  _count: { partidos: number }
}

export interface RefereeBatchDetail extends Omit<RefereeBatchSummary, "_count"> {
  partidos: RefereeMatch[]
}
