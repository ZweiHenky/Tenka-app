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
  /**
   * Identidad estable: BORRADOR | ABIERTA | EN_CURSO | FINALIZADA | CANCELADA. Toda lógica se
   * decide con esto; el nombre es solo la etiqueta que se muestra, y es editable por API.
   */
  codigo?: string
}

export interface TipoCompetenciaRef {
  id: string
  nombre: string
  /** Identidad estable del formato. El nombre es editable; esto no. Ver competition-format.ts. */
  codigo?: string
}

export interface DivisionConRelaciones {
  id: string
  nombre: string
  maxEquipos: number
  arbitraje: number
  diasPartido: string | null
  horarioPartido: string | null
  /** Configuración real por cancha; los escalares de arriba son solo su resumen (unión). */
  canchaHorarios?: CourtScheduleRow[]
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
  registrarParticipaciones: boolean
  registrarGoleo: boolean
  /** Partidos de la fase regular exigidos para alinear en eliminatorias. 0 = sin requisito. */
  minPartidosEliminatoria?: number
  usarPenalesEnEmpates: boolean
  /**
   * Opcionales a propósito, aunque el servidor de hoy siempre los mande: la app se despliega por
   * separado del backend y se encuentra versiones más viejas —el de testing, un usuario que no
   * actualizó, un rollback—. Declararlos obligatorios hacía que un campo ausente tumbara la
   * pantalla con "Cannot read property 'nombre' of undefined", y TypeScript no podía avisar
   * porque el tipo prometía lo que el cable no garantiza.
   */
  categoria?: CategoriaRef
  tipo?: TipoRef
  estadoLiga?: EstadoLigaRef
  tipoCompetencia?: TipoCompetenciaRef
}

export interface LigaCanchaRef {
  id: string
  nombre: string
  activa: boolean
}

/** Días y horario que una división juega en UNA cancha. Sin fila = no juega ahí. */
export interface CourtScheduleRow {
  canchaId: string
  diasPartido: string
  horarioPartido: string
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
  timeZone: string
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
    timeZone: string
  }
  divisiones?: DivisionConRelaciones[]
  canchas?: LigaCanchaRef[]
  usaArbitros?: boolean
  arbitros?: { id: string; nombre: string }[]
  reglas?: LeagueRule[]
  facebook?: string | null
  x?: string | null
  instagram?: string | null
  tiktok?: string | null
}

export interface CreateLeagueInput {
  nombre: string
  descripcion: string
  facebook?: string | null
  x?: string | null
  instagram?: string | null
  tiktok?: string | null
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
  registrarParticipaciones: boolean
  registrarGoleo: boolean
  /** Partidos de la fase regular exigidos para alinear en eliminatorias. 0 = sin requisito. */
  minPartidosEliminatoria?: number
  usarPenalesEnEmpates: boolean
  /**
   * Configuración real por cancha. Cuando trae filas, diasPartido/horarioPartido son solo su
   * resumen (unión) y no deben usarse para decidir dónde cabe un partido.
   */
  canchaHorarios?: CourtScheduleRow[]
  liga?: { id: string; nombre: string; logo: string | null }
  categoria?: CategoriaRef
  estadoLiga?: EstadoLigaRef
  /**
   * Los títulos que ha dado esta división, vigente y anteriores. Solo el id del equipo: sirve para
   * el distintivo de campeón en la ficha del equipo.
   */
  campeones?: { equipoId: string | null }[]
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
  /** Reemplaza por completo la configuración por cancha. Arreglo vacío = volver a los escalares. */
  horariosPorCancha?: CourtScheduleRow[]
  registrarParticipaciones?: boolean
  registrarGoleo?: boolean
  minPartidosEliminatoria?: number
  usarPenalesEnEmpates?: boolean
}
