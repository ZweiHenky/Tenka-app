import { isValidDateStr } from "@/stores/divisionSchedule"

function fechaKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** El lunes de la semana a la que pertenece una fecha. */
function lunesDe(fecha: string): Date {
  const [year, month, day] = fecha.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const diaSemana = date.getDay()
  date.setDate(date.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana))
  return date
}

/**
 * Los días que el listado de Programación debe dibujar.
 *
 * Es la **única** vía de render de los slots: la pantalla recorre estas fechas y agrupa los slots
 * bajo cada una, así que un slot cuya fecha no esté acá simplemente no existe para el usuario. Y
 * el selector "Cambiar día" ofrece exactamente esta lista, así que un día configurado que falte
 * tampoco se puede elegir.
 *
 * Devuelve la unión de:
 *
 *  - **los días configurados de la semana del ancla y de cada semana con partidos**, no solo de
 *    una: un cuadro se reparte en varias, y para mover un partido al domingo de la semana 2 ese
 *    domingo tiene que estar en la lista;
 *  - **las fechas que ya tienen slot**, para que ninguno quede invisible.
 *
 * El ancla es `refDate` y, cuando no hay —una división de puro cuadro se crea con cupo 0, no genera
 * slots y por lo tanto se queda sin él—, el slot más temprano. Sin ese respaldo los días
 * configurados vacíos solo aparecían después de la primera jornada, que es cuando `syncSchedule`
 * escribe `refDate`.
 */
export function visibleWeekDates(
  refDate: string | undefined,
  validDays: number[],
  slots: { fecha: string }[],
): string[] {
  const fechasDeSlots = slots.map((slot) => slot.fecha).filter(isValidDateStr).sort()
  const fechas = new Set<string>(fechasDeSlots)

  const ancla = refDate && isValidDateStr(refDate) ? refDate : fechasDeSlots[0]
  if (ancla && validDays.length > 0) {
    // Las semanas que importan: la del ancla más las que tienen algún partido. Recorrer todo el
    // rango llenaría de días vacíos las semanas intermedias sin nada agendado.
    // Normalizado a lunes: los valores guardados ya lo son, pero la fecha de un slot puede ser
    // cualquier día y los offsets saldrían corridos.
    const lunes = new Map([ancla, ...fechasDeSlots].map((fecha) => {
      const monday = lunesDe(fecha)
      return [fechaKey(monday), monday] as const
    }))

    for (const monday of lunes.values()) {
      for (const diaSemana of validDays) {
        const date = new Date(monday)
        date.setDate(date.getDate() + (diaSemana === 0 ? 6 : diaSemana - 1))
        fechas.add(fechaKey(date))
      }
    }
  }

  // ISO ordena bien como texto, y así el listado queda cronológico aunque el cuadro cruce semanas.
  return [...fechas].sort()
}
