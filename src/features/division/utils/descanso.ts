interface SlotParaDescanso {
  id: string
  tipo?: string
  equipoLocalId?: string
  equipoVisitanteId?: string
}

/**
 * Equipos candidatos a que un complemento los saque del reparto de partidos regulares.
 *
 * Solo cuenta el lado de "Puntos", y solo si ese equipo no está asignado en un slot **regular**: el
 * servidor puede reservarlo (`usedTeamIds.add`) para absorber al equipo sobrante cuando los
 * habilitados son impares. Si ya tiene un regular, está repitiendo a propósito y sigue contando
 * para el reparto. La paridad se aplica después en `equiposDisponiblesParaRegulares`.
 *
 * Lo que lo libera es únicamente un slot regular, porque son los únicos que el servidor procesa
 * antes y que alimentan `usedTeamIds`. Un amistoso u otro complemento no lo libera; si hay un
 * descanso por cubrir, un equipo que solo aparezca ahí sigue siendo candidato a absorberlo.
 */
export function equiposAbsorbidosPorComplementos(slots: readonly SlotParaDescanso[]): string[] {
  const enRegular = new Set<string>()
  for (const slot of slots) {
    const tipo = slot.tipo ?? 'regular'
    if (tipo !== 'regular') continue
    if (slot.equipoLocalId) enRegular.add(slot.equipoLocalId)
    if (slot.equipoVisitanteId) enRegular.add(slot.equipoVisitanteId)
  }

  const absorbidos: string[] = []
  for (const slot of slots) {
    if (slot.tipo !== 'complemento') continue
    const puntos = slot.equipoLocalId
    if (!puntos) continue
    if (enRegular.has(puntos) || absorbidos.includes(puntos)) continue
    absorbidos.push(puntos)
  }
  return absorbidos
}

/**
 * Cuántos equipos quedan para emparejar en los partidos regulares.
 *
 * Un complemento solo sustituye el descanso natural de una jornada impar. Con habilitados pares,
 * o después de absorber ya a un equipo, los demás equipos de Puntos conservan su regular para que
 * el complemento realmente sea un partido adicional.
 */
export function equiposDisponiblesParaRegulares(
  habilitados: readonly string[],
  slots: readonly SlotParaDescanso[],
): number {
  const absorbidos = new Set(equiposAbsorbidosPorComplementos(slots))
  const puedeAbsorberDescanso = habilitados.length % 2 !== 0
    && habilitados.some((id) => absorbidos.has(id))
  return habilitados.length - Number(puedeAbsorberDescanso)
}

/**
 * Si la jornada exige que alguien descanse.
 *
 * Se mira **cuántos equipos quedan disponibles**, no cuántos hay habilitados. Antes la regla era
 * "habilitados impares y ningún complemento", que daba por hecho que cualquier complemento absorbía
 * al sobrante: eso deja de ser cierto cuando el equipo de puntos repite, y además fallaba al revés
 * —con 20 habilitados y un complemento no pedía descanso, pero quedaban 19 disponibles y el
 * servidor rechazaba la jornada con "deja un equipo sin programar"—.
 *
 * No mira si ya eligieron equipo: la tarjeta para elegirlo tiene que seguir visible después, o no
 * habría forma de cambiarlo.
 */
export function exigeEquipoQueDescansa(
  habilitados: readonly string[] | undefined,
  slots: readonly SlotParaDescanso[],
): boolean {
  if (!habilitados || habilitados.length < 3) return false
  return equiposDisponiblesParaRegulares(habilitados, slots) % 2 !== 0
}
