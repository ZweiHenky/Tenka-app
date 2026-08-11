export interface CategoriaRef {
  id: string
  nombre: string
}

export interface TipoRef {
  id: string
  nombre: string
}

export interface EstadoLigaRef {
  id: string
  nombre: string
}

export interface TipoCompetenciaRef {
  id: string
  nombre: string
}

export interface DivisionConRelaciones {
  id: string
  nombre: string
  maxEquipos: number
  arbitraje: number
  diasPartido: string | null
  horarioPartido: string | null
  duracionPartido: number | null
  descanso: number | null
  fechaInicio: string | null
  fechaFin: string | null
  createdAt: string
  updatedAt: string
  ligaId: string
  estadoLigaId: string
  categoriaId: string
  tipoId: string
  tipoCompetenciaId: string
  canchaUnicaId: string | null
  registrarParticipaciones: boolean
  usarPenalesEnEmpates: boolean
  categoria: CategoriaRef
  tipo: TipoRef
  estadoLiga: EstadoLigaRef
  tipoCompetencia: TipoCompetenciaRef
}

export interface LigaCanchaRef {
  id: string
  nombre: string
  activa: boolean
}

export interface LeagueCourtInput {
  id?: string
  nombre?: string
  activa?: boolean
}

export interface LeagueRule {
  titulo: string
  detalle: string
}

export interface League {
  id: string
  nombre: string
  descripcion: string
  logo: string | null
  cancha: string | null
  multiplesCanchas: boolean
  createdAt: string
  updatedAt: string
  ubicacionId: string
  userId: string
  user?: {
    name: string | null
    phoneNumber: string | null
    showPhoneInPublicLeague: boolean
  }
  ubicacion?: {
    id: string
    nombreCompleto: string
    estado: string
    municipio: string
    lat: number
    lng: number
  }
  divisiones?: DivisionConRelaciones[]
  canchas?: LigaCanchaRef[]
  usaArbitros?: boolean
  arbitros?: { id: string; nombre: string }[]
  reglas?: LeagueRule[]
}

export interface CreateLeagueInput {
  nombre: string
  descripcion: string
  logoAssetId?: string | null
  coverAssetId?: string | null
  multiplesCanchas?: boolean
  canchas?: LeagueCourtInput[]
  usaArbitros?: boolean
  arbitros?: { id?: string; nombre: string; activo?: boolean }[]
  reglas?: LeagueRule[]
  ubicacionId: string
}

export interface Division {
  id: string
  nombre: string
  maxEquipos: number
  arbitraje: number
  diasPartido: string | null
  horarioPartido: string | null
  duracionPartido: number | null
  descanso: number | null
  fechaInicio: string | null
  createdAt: string
  updatedAt: string
  ligaId: string
  estadoLigaId: string
  categoriaId: string
  tipoId: string
  tipoCompetenciaId: string
  canchaUnicaId: string | null
  registrarParticipaciones: boolean
  usarPenalesEnEmpates: boolean
  liga?: { id: string; nombre: string; logo: string | null }
  categoria?: CategoriaRef
  estadoLiga?: { id: string; nombre: string }
}

export interface CreateDivisionInput {
  nombre: string
  maxEquipos: number
  arbitraje: number
  diasPartido?: string
  horarioPartido?: string
  duracionPartido?: number
  descanso?: number
  fechaInicio?: string
  fechaFin?: string
  ligaId: string
  estadoLigaId?: string
  categoriaId: string
  tipoId: string
  tipoCompetenciaId: string
  canchaUnicaId?: string | null
  registrarParticipaciones?: boolean
  usarPenalesEnEmpates?: boolean
}
