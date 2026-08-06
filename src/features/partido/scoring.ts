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

export interface ResultPayload {
  expectedVersion: number
  estado: string
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  allocations: ResultAnnotationInput[]
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
