import type { CourtScheduleRow, CreateDivisionInput, Division, LigaCanchaRef } from "@/domain/interfaces/league"
import { calculateTimeRangeCapacity, parseTimeRanges, validateTimeRange } from "@/shared/utils/time-range"

/** Días y horario de la división en UNA cancha, tal como los edita el formulario. */
export interface CourtFormEntry {
  juega: boolean
  diasPartido: string
  horarioPartido: string
}

export const EMPTY_COURT_ENTRY: CourtFormEntry = { juega: false, diasPartido: "", horarioPartido: "" }

export interface DivisionFormState {
  nombre: string
  maxEquipos: string
  arbitraje: string
  duracionPartido: string
  descanso: string
  categoriaId: string
  tipoId: string
  tipoCompetenciaId: string
  diasPartido: string
  horarioPartido: string
  usarPenalesEnEmpates: boolean
  /** Apagado = cada cancha define sus propios días y horario. */
  mismoHorarioTodasLasCanchas: boolean
  porCancha: Record<string, CourtFormEntry>
}

export const EMPTY_DIVISION_FORM: DivisionFormState = {
  nombre: "",
  maxEquipos: "",
  arbitraje: "",
  duracionPartido: "",
  descanso: "",
  categoriaId: "",
  tipoId: "",
  tipoCompetenciaId: "",
  diasPartido: "",
  horarioPartido: "",
  usarPenalesEnEmpates: true,
  mismoHorarioTodasLasCanchas: true,
  porCancha: {},
}

function hasValidRanges(value: string): boolean {
  const ranges = parseTimeRanges(value)
  return ranges.length > 0 && ranges.every((r) => /^\d{2}:\d{2}$/.test(r.start) && /^\d{2}:\d{2}$/.test(r.end))
}

/** Estado inicial del formulario: desde la división al editar, o vacío al crear. */
export function hydrateDivisionForm(
  division: Division | null,
  canchas: LigaCanchaRef[],
): DivisionFormState {
  const porCancha = Object.fromEntries(canchas.map((court) => {
    const row = division?.canchaHorarios?.find((entry) => entry.canchaId === court.id)
    return [court.id, row
      ? { juega: true, diasPartido: row.diasPartido, horarioPartido: row.horarioPartido }
      : { ...EMPTY_COURT_ENTRY }]
  }))

  if (!division) return { ...EMPTY_DIVISION_FORM, porCancha }

  return {
    nombre: division.nombre,
    maxEquipos: String(division.maxEquipos),
    arbitraje: String(division.arbitraje),
    duracionPartido: division.duracionPartido != null ? String(division.duracionPartido) : "",
    descanso: division.descanso != null ? String(division.descanso) : "",
    categoriaId: division.categoriaId,
    tipoId: division.tipoId,
    tipoCompetenciaId: division.tipoCompetenciaId,
    diasPartido: division.diasPartido || "",
    horarioPartido: division.horarioPartido || "",
    usarPenalesEnEmpates: division.usarPenalesEnEmpates !== false,
    // Que existan filas significa que la división se configuró cancha por cancha.
    mismoHorarioTodasLasCanchas: (division.canchaHorarios ?? []).length === 0,
    porCancha,
  }
}

/** Las canchas donde la división juega, en el formato que espera la API. */
export function perCourtRows(form: DivisionFormState): CourtScheduleRow[] {
  return Object.entries(form.porCancha)
    .filter(([, entry]) => entry.juega)
    .map(([canchaId, entry]) => ({
      canchaId,
      diasPartido: entry.diasPartido,
      horarioPartido: entry.horarioPartido,
    }))
}

/** Primer error del formulario, o null si está listo para guardar. */
export function validateDivisionForm(form: DivisionFormState, canchas: LigaCanchaRef[]): string | null {
  if (!form.nombre.trim()) return "El nombre es obligatorio"
  const maxEquipos = Number(form.maxEquipos)
  if (!Number.isFinite(maxEquipos) || maxEquipos < 2 || maxEquipos !== Math.floor(maxEquipos)) {
    return "Equipos debe ser un número entero mayor o igual a 2"
  }
  if (!form.categoriaId) return "Selecciona una categoría"
  if (!form.tipoId) return "Selecciona un tipo"
  if (!form.tipoCompetenciaId) return "Selecciona un tipo de competencia"

  const dur = form.duracionPartido
  if (!dur || !Number.isFinite(Number(dur)) || Number(dur) <= 0) {
    return "Duración del partido es obligatoria y debe ser un número positivo"
  }
  const desc = form.descanso
  if (desc && (!Number.isFinite(Number(desc)) || Number(desc) < 0)) return "Tiempo libre debe ser un número no negativo"

  // Mismas reglas en ambos modos; solo cambia de dónde salen los días y las horas.
  const checkSchedule = (dias: string, horario: string, label: string): string | null => {
    if (!dias) return `Selecciona al menos un día de partido${label}`
    if (!hasValidRanges(horario)) return `Agrega al menos un rango de horario${label}`
    const ranges = parseTimeRanges(horario)
    for (let index = 0; index < ranges.length; index++) {
      const range = ranges[index]
      const rangeError = validateTimeRange(range.start, range.end, ranges, index)
      if (rangeError) return `${rangeError}${label}`
      const capacity = calculateTimeRangeCapacity(range.start, range.end, Number(dur), Number(desc) || 0)
      if (capacity.matchCount === 0) return `El rango ${range.start} - ${range.end} no alcanza para un partido completo${label}`
    }
    return null
  }

  if (form.mismoHorarioTodasLasCanchas) return checkSchedule(form.diasPartido, form.horarioPartido, "")

  const rows = perCourtRows(form)
  if (rows.length === 0) return "Activa al menos una cancha para esta división"
  for (const row of rows) {
    const nombre = canchas.find((court) => court.id === row.canchaId)?.nombre ?? "la cancha"
    const error = checkSchedule(row.diasPartido, row.horarioPartido, ` en ${nombre}`)
    if (error) return error
  }
  return null
}

/**
 * Payload para crear o editar. Con horario compartido se mandan los escalares; por cancha, las
 * filas (el backend deriva el resumen). Al editar en modo compartido se manda un arreglo vacío
 * para borrar las filas que hubiera y volver a los escalares.
 */
export function buildDivisionPayload(
  form: DivisionFormState,
  { ligaId, isEdit }: { ligaId: string; isEdit: false },
): CreateDivisionInput
export function buildDivisionPayload(
  form: DivisionFormState,
  { ligaId, isEdit }: { ligaId: string; isEdit: boolean },
): Partial<CreateDivisionInput>
export function buildDivisionPayload(
  form: DivisionFormState,
  { ligaId, isEdit }: { ligaId: string; isEdit: boolean },
): Partial<CreateDivisionInput> {
  return {
    nombre: form.nombre.trim(),
    maxEquipos: Number(form.maxEquipos),
    arbitraje: Number(form.arbitraje) || 0,
    duracionPartido: form.duracionPartido ? Number(form.duracionPartido) : undefined,
    descanso: form.descanso ? Number(form.descanso) : undefined,
    ...(form.mismoHorarioTodasLasCanchas
      ? {
          diasPartido: form.diasPartido,
          horarioPartido: form.horarioPartido,
          ...(isEdit ? { horariosPorCancha: [] } : {}),
        }
      : { horariosPorCancha: perCourtRows(form) }),
    ligaId,
    categoriaId: form.categoriaId,
    tipoId: form.tipoId,
    // El formato se fija al crear: mandarlo en edición permitiría cambiarlo desde un cliente
    // manipulado y dejar la división con datos de un formato que ya no aplica.
    ...(isEdit ? {} : { tipoCompetenciaId: form.tipoCompetenciaId }),
    usarPenalesEnEmpates: form.usarPenalesEnEmpates,
  }
}
