export type ScoreSide = "LOCAL" | "VISITANTE"

export interface PartidoAnotacion {
  id?: string
  ladoMarcador: ScoreSide
  jugadorId: string | null
  equipoId?: string | null
  cantidad: number
  jugadorNombre?: string | null
  equipoNombre?: string | null
  dorsal?: number | null
}

export interface ScorerAllocation {
  ladoMarcador: ScoreSide
  jugadorId: string
  cantidad: number
}

export interface ScorerCandidate {
  id: string
  nombre: string
  foto: string | null
  dorsal?: number | null
}

export interface ResultAnnotationInput {
  ladoMarcador: ScoreSide
  jugadorId: string | null
  cantidad: number
}

export interface ParticipacionInput {
  ladoMarcador: ScoreSide
  jugadorId: string
}

export interface PartidoParticipacion {
  id?: string
  ladoMarcador: ScoreSide
  jugadorId: string | null
  equipoId?: string | null
  jugadorNombre?: string | null
  equipoNombre?: string | null
  dorsal?: number | null
}

export interface ResultPayload {
  expectedVersion: number
  estado: string
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  allocations: ResultAnnotationInput[]
  participaciones?: ParticipacionInput[]
  notas?: string | null
}

export function assignedGoals(allocations: ScorerAllocation[], side: ScoreSide): number {
  return allocations
    .filter((item) => item.ladoMarcador === side)
    .reduce((total, item) => total + item.cantidad, 0)
}

export function canSetAllocation(
  allocations: ScorerAllocation[],
  side: ScoreSide,
  playerId: string,
  quantity: number,
  score: number,
): boolean {
  if (!Number.isInteger(quantity) || quantity < 0) return false
  const assignedWithoutPlayer = allocations
    .filter((item) => item.ladoMarcador === side && item.jugadorId !== playerId)
    .reduce((total, item) => total + item.cantidad, 0)
  return assignedWithoutPlayer + quantity <= Math.max(0, score)
}

export function allocationsFromAnnotations(annotations: PartidoAnotacion[] = []): ScorerAllocation[] {
  return annotations
    .filter((item): item is PartidoAnotacion & { jugadorId: string } => !!item.jugadorId && item.cantidad > 0)
    .map(({ ladoMarcador, jugadorId, cantidad }) => ({ ladoMarcador, jugadorId, cantidad }))
}

/**
 * ¿El partido tiene goleadores **con nombre** capturados?
 *
 * No sirve `anotaciones.length > 0`: el servidor escribe filas sin dueño (`jugadorId` nulo) para que
 * la suma de anotaciones cuadre con el marcador, **también cuando el goleo está apagado**. Contarlas
 * hacía aparecer el editor de goleadores en cada partido guardado con el interruptor en off.
 *
 * Es la pregunta que decide si se aplica la regla de "congelar, no esconder": el editor se sigue
 * mostrando deshabilitado solo si hay algo capturado que quedaría invisible e incorregible.
 */
export function hayGoleadoresCapturados(anotaciones: PartidoAnotacion[] = []): boolean {
  return allocationsFromAnnotations(anotaciones).length > 0
}

export function participacionesFromResponse(participaciones: PartidoParticipacion[] = []): ParticipacionInput[] {
  return participaciones
    .filter((item): item is PartidoParticipacion & { jugadorId: string } => !!item.jugadorId)
    .map(({ ladoMarcador, jugadorId }) => ({ ladoMarcador, jugadorId }))
}

export function toggleParticipacion(
  participaciones: ParticipacionInput[],
  ladoMarcador: ScoreSide,
  jugadorId: string,
): ParticipacionInput[] {
  const exists = participaciones.some((item) => item.ladoMarcador === ladoMarcador && item.jugadorId === jugadorId)
  if (exists) {
    return participaciones.filter((item) => !(item.ladoMarcador === ladoMarcador && item.jugadorId === jugadorId))
  }
  return [...participaciones.filter((item) => item.jugadorId !== jugadorId), { ladoMarcador, jugadorId }]
}

export function isParticipant(participaciones: ParticipacionInput[], ladoMarcador: ScoreSide, jugadorId: string): boolean {
  return participaciones.some((item) => item.ladoMarcador === ladoMarcador && item.jugadorId === jugadorId)
}

export function filterScorerCandidatesByParticipants(players: ScorerCandidate[], participaciones: ParticipacionInput[], side: ScoreSide): ScorerCandidate[] {
  const participantIds = new Set(participaciones.filter((item) => item.ladoMarcador === side).map((item) => item.jugadorId))
  return players.filter((player) => participantIds.has(player.id))
}

export function buildScorerCandidates(
  roster: ScorerCandidate[],
  records: { ladoMarcador: ScoreSide; jugadorId: string | null; jugadorNombre?: string | null; dorsal?: number | null }[],
  side: ScoreSide,
): ScorerCandidate[] {
  const candidates = [...roster]
  for (const record of records) {
    if (record.ladoMarcador === side && record.jugadorId && !candidates.some((item) => item.id === record.jugadorId)) {
      candidates.push({ id: record.jugadorId, nombre: record.jugadorNombre ?? "Jugador", foto: null, dorsal: record.dorsal ?? null })
    }
  }
  return candidates.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export function buildResultAnnotations(
  allocations: ScorerAllocation[],
  golesLocal: number,
  golesVisitante: number,
): ResultAnnotationInput[] {
  const result: ResultAnnotationInput[] = allocations
    .filter((item) => item.cantidad > 0)
    .map(({ ladoMarcador, jugadorId, cantidad }) => ({ ladoMarcador, jugadorId, cantidad }))

  for (const [side, score] of [["LOCAL", golesLocal], ["VISITANTE", golesVisitante]] as const) {
    const remaining = Math.max(0, score - assignedGoals(allocations, side))
    if (remaining > 0) result.push({ ladoMarcador: side, jugadorId: null, cantidad: remaining })
  }
  return result
}

export function hasValidAllocations(allocations: ScorerAllocation[], golesLocal: number, golesVisitante: number): boolean {
  return assignedGoals(allocations, "LOCAL") <= golesLocal
    && assignedGoals(allocations, "VISITANTE") <= golesVisitante
}

export function buildResultPayload(input: Omit<ResultPayload, "allocations"> & { allocations: ScorerAllocation[] }): ResultPayload {
  const { allocations, ...result } = input
  return { ...result, allocations: buildResultAnnotations(allocations, result.golesLocal, result.golesVisitante) }
}
export function isResultEditable(estado: string | null, correcting: boolean): boolean {
  return estado !== "FINALIZADO" || correcting
}
