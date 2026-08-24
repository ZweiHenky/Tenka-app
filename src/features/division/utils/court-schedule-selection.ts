/** Días y horario de una división en UNA cancha, ya con el nombre resuelto para mostrar. */
export interface CourtScheduleLine {
  canchaId: string
  nombre: string
  diasPartido: string
  horarioPartido: string
}

/** Pasa las filas crudas al formato de la lista, resolviendo el nombre contra las canchas. */
export function courtScheduleLines(
  rows: { canchaId: string; diasPartido: string; horarioPartido: string; cancha?: { nombre: string } }[] | undefined,
  canchas?: { id: string; nombre: string }[],
): CourtScheduleLine[] {
  return (rows ?? []).map((row) => ({
    canchaId: row.canchaId,
    nombre: row.cancha?.nombre ?? canchas?.find((court) => court.id === row.canchaId)?.nombre ?? "Cancha",
    diasPartido: row.diasPartido,
    horarioPartido: row.horarioPartido,
  }))
}

/** Opción "ver el resumen": los días y horas de la división en cualquiera de sus canchas. */
export const TODAS_LAS_CANCHAS = "__todas__"

export interface CourtSelectorOption {
  id: string
  nombre: string
}

/**
 * Opciones del selector de cancha.
 *
 * Con menos de dos canchas devuelve vacío: no hay nada que elegir, y con una sola el resumen de la
 * división **es** el horario de esa cancha.
 */
export function courtSelectorOptions(lines: CourtScheduleLine[]): CourtSelectorOption[] {
  if (lines.length < 2) return []
  return [
    { id: TODAS_LAS_CANCHAS, nombre: "Todas las canchas" },
    ...lines.map((line) => ({ id: line.canchaId, nombre: line.nombre })),
  ]
}

export interface CourtScheduleSummary {
  diasPartido: string | null
  horarioPartido: string | null
}

/**
 * Los días y el horario a mostrar según la cancha elegida.
 *
 * Cae al resumen de la división cuando no hay selección, cuando se eligió "todas", o cuando el id
 * ya no corresponde a ninguna cancha — esto último pasa si la división cambió de canchas entre que
 * se abrió la pantalla y ahora, y es preferible mostrar el resumen que dejar los datos en blanco.
 *
 * Ojo con el resumen: es la **unión** de las canchas. "sáb, dom · 08:00-22:00" puede ser una cancha
 * que solo juega sábado de 8 a 12 y otra que solo juega domingo de 18 a 22; nadie juega ese rango
 * completo. Por eso existe el selector.
 */
export function selectedCourtSchedule(
  lines: CourtScheduleLine[],
  summary: CourtScheduleSummary,
  selectedId: string | null,
): CourtScheduleSummary {
  if (!selectedId || selectedId === TODAS_LAS_CANCHAS) return summary
  const line = lines.find((entry) => entry.canchaId === selectedId)
  if (!line) return summary
  return { diasPartido: line.diasPartido, horarioPartido: line.horarioPartido }
}
