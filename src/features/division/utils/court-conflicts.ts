import type { CourtConflict } from "@/features/court-availability/planner"
import type { AddSlotFailure } from "@/stores/divisionSchedule"

export interface CourtConflictSummary {
  count: number
  title: string
  detail: string
  remedy: string
}

/**
 * Las dos únicas salidas reales cuando la semana no da: ampliar el horario propio o sumar una
 * cancha. Se comparte entre el aviso de choque y el de "no se pudo agregar el slot" para que la
 * app diga siempre lo mismo.
 */
export const SCHEDULE_REMEDY = "Cambia los días u horarios de la división, o agrégale otra cancha."

/**
 * Los slots regulares no entran en la lista de salidas: su cantidad la fijan los equipos
 * habilitados y no se pueden borrar, así que decirle al usuario "corrige los conflictos" sin más
 * lo deja sin nada que hacer en esta pantalla.
 */
export const CONFLICT_REMEDY =
  `Los slots regulares no se pueden borrar: hay uno por cada par de equipos habilitados. ${SCHEDULE_REMEDY}`

/**
 * Por qué no se pudo agregar un amistoso o un complemento.
 *
 * La distinción importa: la causa más común es que **otras divisiones** ya reservaron la cancha,
 * y sus partidos no se ven en Programación — la pantalla muestra huecos que en realidad están
 * tomados. Un único "no hay horarios disponibles" obligaba a adivinar.
 */
export function addSlotFailureMessage(reason: AddSlotFailure | null): string {
  switch (reason) {
    case 'CANCHAS_OCUPADAS':
      return `Los horarios que quedan libres esta semana ya están reservados por otras divisiones. ${SCHEDULE_REMEDY}`
    case 'SEMANA_LLENA':
      return `La semana ya está llena con los partidos de los equipos habilitados. ${SCHEDULE_REMEDY}`
    case 'SIN_CONFIGURACION':
      return "La división no tiene días y horarios configurados en ninguna cancha."
    case 'NO_PERMITIDO':
      return "Ese tipo de partido no se puede agregar en modo eliminatorias."
    default:
      return `No se pudo agregar el partido esta semana. ${SCHEDULE_REMEDY}`
  }
}

/**
 * Texto del aviso de conflicto. Vive aparte del componente para poder probarlo sin montar la
 * pantalla, que es la única forma de cubrirlo en este repo.
 */
export function summarizeCourtConflicts(
  conflicts: CourtConflict[],
  courtNames: Map<string, string> = new Map(),
): CourtConflictSummary | null {
  if (conflicts.length === 0) return null

  const busyCourts = [...new Set(
    conflicts
      .filter((conflict) => conflict.reason === "OVERLAP" && conflict.canchaId)
      .map((conflict) => courtNames.get(conflict.canchaId!) ?? conflict.canchaId!),
  )]
  const hasNoCapacity = conflicts.some((conflict) => conflict.reason === "NO_CAPACITY")

  const details: string[] = []
  if (busyCourts.length === 1) {
    details.push(`La cancha "${busyCourts[0]}" ya está ocupada a esa hora por otra división.`)
  } else if (busyCourts.length > 1) {
    details.push(`Las canchas ${busyCourts.map((name) => `"${name}"`).join(", ")} ya están ocupadas a esa hora por otras divisiones.`)
  }
  if (hasNoCapacity) {
    details.push("Ninguna cancha configurada para esta división está libre a esa hora.")
  }
  // Un OVERLAP sin cancha resuelta (liga de cancha única) no cae en ninguno de los dos casos.
  if (details.length === 0) {
    details.push("Otra división ya tiene reservada esa cancha a esa hora.")
  }

  return {
    count: conflicts.length,
    title: conflicts.length === 1
      ? "1 horario en conflicto con otra división"
      : `${conflicts.length} horarios en conflicto con otras divisiones`,
    detail: details.join(" "),
    remedy: CONFLICT_REMEDY,
  }
}
