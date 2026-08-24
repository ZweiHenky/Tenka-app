interface SlotConEquipos {
  tipo?: string
  equipoLocalId?: string
  equipoVisitanteId?: string
}

/**
 * Slots donde un equipo puede jugar **aunque ya tenga otro partido** en la jornada.
 *
 * Complemento y amistoso son partidos extra: no consumen al equipo, así que puede jugarlos además
 * de su regular. Es lo que permite que un equipo atrasado juegue dos o tres veces en la semana.
 *
 * Refleja al servidor: solo los slots regulares alimentan `usedTeamIds` antes de procesar los
 * complementos, y el amistoso no reserva a nadie.
 */
export function permiteRepetirEquipo(tipo?: string): boolean {
  return tipo === 'complemento' || tipo === 'amistoso'
}

/**
 * Equipos que ya ocupan un slot que **no** permite repetir — regular o eliminatoria—, y que por eso
 * no deben ofrecerse para otro de esos.
 *
 * Un equipo que solo aparece en un complemento o un amistoso **no** queda comprometido: sigue
 * disponible para su partido regular, y sin eso no habría forma de darle los dos.
 */
export function equiposComprometidos(slots: readonly SlotConEquipos[]): Set<string> {
  const comprometidos = new Set<string>()
  for (const slot of slots) {
    if (permiteRepetirEquipo(slot.tipo)) continue
    if (slot.equipoLocalId) comprometidos.add(slot.equipoLocalId)
    if (slot.equipoVisitanteId) comprometidos.add(slot.equipoVisitanteId)
  }
  return comprometidos
}
