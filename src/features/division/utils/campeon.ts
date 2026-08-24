/**
 * Quién ganó, y si el torneo ya se puede cerrar.
 *
 * La regla de desempate vive acá y no en `BracketView` porque ahora la usan tres lugares (el
 * cuadro, la sugerencia de campeón y sus tests) y el repo no tiene tests de componentes.
 */

export interface PartidoDeCuadro {
  estado?: string | null
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  equipoLocalId?: string | null
  equipoVisitanteId?: string | null
  equipoLocal?: { id: string; nombre: string; logo: string | null }
  equipoVisitante?: { id: string; nombre: string; logo: string | null }
}

export interface RondaDeCuadro {
  orden: number
  partidos: PartidoDeCuadro[]
}

export type LadoGanador = "LOCAL" | "VISITANTE"

/**
 * `null` mientras el partido no esté finalizado, y también en un empate sin penales: un cuadro mal
 * capturado no debe inventar un ganador.
 */
export function ladoGanador(partido: PartidoDeCuadro): LadoGanador | null {
  if (partido.estado !== "FINALIZADO") return null
  if (partido.golesLocal > partido.golesVisitante) return "LOCAL"
  if (partido.golesVisitante > partido.golesLocal) return "VISITANTE"
  const penalesLocal = partido.penalesLocal
  const penalesVisitante = partido.penalesVisitante
  if (penalesLocal == null || penalesVisitante == null) return null
  if (penalesLocal > penalesVisitante) return "LOCAL"
  if (penalesVisitante > penalesLocal) return "VISITANTE"
  return null
}

/** La final es la ronda de `orden` máximo: el nombre del catálogo es editable. */
export function ultimaRonda<T extends { orden: number }>(rondas: readonly T[]): T | null {
  if (rondas.length === 0) return null
  return rondas.reduce((mayor, ronda) => (ronda.orden > mayor.orden ? ronda : mayor), rondas[0])
}

/** El cuadro está cerrado cuando la última ronda tiene partidos y todos terminaron. */
export function cuadroCompleto(rondas: readonly RondaDeCuadro[]): boolean {
  const partidos = ultimaRonda(rondas)?.partidos ?? []
  return partidos.length > 0 && partidos.every((partido) => partido.estado === "FINALIZADO")
}

/**
 * El torneo terminó y nadie coronó a nadie. Es la condición del aviso de la pantalla de división,
 * que tiene que salir también cuando la final la cerró un árbitro desde su enlace por token —ahí
 * no hay app donde mostrar el modal del momento.
 */
export function faltaCampeon(rondas: readonly RondaDeCuadro[], campeon: unknown): boolean {
  return rondas.length > 0 && cuadroCompleto(rondas) && !campeon
}

export interface EquipoSugerido {
  equipoId: string
  nombre: string
}

/**
 * El ganador de la final, para llegar preseleccionado al selector. Es una sugerencia, no una
 * decisión: el dueño puede cambiarla (descalificaciones, torneos resueltos fuera de la app).
 *
 * Devuelve `null` si la última ronda tiene más de un partido — no hay una final única de la que
 * salga un solo campeón.
 */
export function campeonSugerido(rondas: readonly RondaDeCuadro[]): EquipoSugerido | null {
  const partidos = ultimaRonda(rondas)?.partidos ?? []
  if (partidos.length !== 1) return null
  const final = partidos[0]
  const lado = ladoGanador(final)
  if (!lado) return null
  const equipo = lado === "LOCAL" ? final.equipoLocal : final.equipoVisitante
  const equipoId = (lado === "LOCAL" ? final.equipoLocalId : final.equipoVisitanteId) ?? equipo?.id
  if (!equipoId) return null
  return { equipoId, nombre: equipo?.nombre ?? "" }
}

export interface GoleadorSugerible {
  jugadorId: string | null
  nombre: string
  goles: number
}

/**
 * El líder de goleo. Las filas ya vienen ordenadas del servidor; se descartan las que no tienen
 * `jugadorId` porque son goles de jugadores borrados y no se les puede adjudicar un título.
 */
export function goleadorSugerido<T extends GoleadorSugerible>(rows: readonly T[]): T | null {
  return rows.find((row) => row.jugadorId != null) ?? null
}

/**
 * El sugerido primero, el resto en su orden.
 *
 * Los equipos llegan por nombre y al sugerido solo lo distinguía un chip, así que en una división
 * de veinte podía quedar al final de la lista: había que desplazarse para encontrarlo y era fácil
 * coronar a otro por error.
 *
 * Solo mueve a uno. Reordenar la lista entera —por ejemplo alfabéticamente desde cero— rompería el
 * orden que la pantalla ya eligió para los demás.
 */
export function conSugeridoPrimero<T extends { id: string }>(
  items: readonly T[],
  sugeridoId: string | null | undefined,
): T[] {
  if (!sugeridoId) return [...items]
  const sugerido = items.find((item) => item.id === sugeridoId)
  if (!sugerido) return [...items]
  return [sugerido, ...items.filter((item) => item.id !== sugeridoId)]
}
