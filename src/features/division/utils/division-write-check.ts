import type { CourtScheduleRow, CreateDivisionInput, Division } from "@/domain/interfaces/league"

/**
 * Campos escalares que la comparación revisa uno a uno.
 *
 * **Al agregar un campo nuevo a `CreateDivisionInput` hay que agregarlo aquí.** Si no, una escritura
 * ambigua de ese campo —un corte de red justo al guardar— se daría por confirmada sin haberla
 * comprobado. Pasó con `minPartidosEliminatoria`: se agregó al payload y no a esta lista.
 *
 * `fechaInicio` y `horariosPorCancha` quedan fuera a propósito: no se comparan con `===`.
 */
const CAMPOS_ESCALARES: (keyof CreateDivisionInput)[] = [
  "nombre", "maxEquipos", "arbitraje", "diasPartido", "horarioPartido", "duracionPartido", "descanso",
  "estadoLigaId", "categoriaId", "tipoId", "tipoCompetenciaId",
  "registrarParticipaciones", "registrarGoleo", "usarPenalesEnEmpates", "minPartidosEliminatoria",
]

/** Orden y forma estables, para que dos configuraciones equivalentes se comparen iguales. */
const canonical = (rows: CourtScheduleRow[] | undefined) => JSON.stringify(
  [...(rows ?? [])]
    .map((row) => ({ canchaId: row.canchaId, diasPartido: row.diasPartido, horarioPartido: row.horarioPartido }))
    .sort((a, b) => a.canchaId.localeCompare(b.canchaId)),
)

/**
 * ¿La división que devuelve el servidor ya trae lo que intentamos guardar?
 *
 * Es el criterio de la recuperación de escritura ambigua: si la respuesta se perdió pero el cambio
 * llegó, no hay que reintentar. Solo se miran los campos **enviados**; los ausentes no opinan.
 */
export function divisionWriteCommitted(
  data: Partial<CreateDivisionInput>,
  division: Division,
): boolean {
  const escalaresCoinciden = CAMPOS_ESCALARES.every(
    (campo) => data[campo] === undefined || division[campo as keyof Division] === data[campo],
  )
  // La fecha vuelve como instante ISO, así que se compara por prefijo y no con `===`.
  const fechaCoincide = data.fechaInicio === undefined
    || division.fechaInicio?.startsWith(data.fechaInicio) === true
  // Un arreglo con `===` siempre diría "distinto"; omitirlo daría por guardado un cambio de
  // horarios por cancha que quizá no llegó.
  const canchasCoinciden = data.horariosPorCancha === undefined
    || canonical(data.horariosPorCancha) === canonical(division.canchaHorarios)

  return escalaresCoinciden && fechaCoincide && canchasCoinciden
}
