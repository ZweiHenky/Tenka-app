import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import type { CourtAvailability, CourtMode, CourtOccupancy } from "./api/courtAvailability"

const VIRTUAL_COURT = "__VIRTUAL__"

interface Interval {
  id: string
  start: number
  end: number
  canchaId: string | null
}

export interface CourtConflict {
  slotId: string
  canchaId: string | null
  blockerIds: string[]
  reason: "OVERLAP" | "NO_CAPACITY"
}

export interface CourtPlan {
  slots: TimeSlotConfig[]
  conflicts: CourtConflict[]
  unassignedSlotIds: string[]
  loads: Record<string, number>
}

export function halfOpenOverlaps(left: Pick<Interval, "start" | "end">, right: Pick<Interval, "start" | "end">): boolean {
  return left.start < right.end && left.end > right.start
}

function slotInterval(slot: TimeSlotConfig): Interval | null {
  const start = new Date(`${slot.fecha}T${slot.horaInicio}:00`).getTime()
  let end = new Date(`${slot.fecha}T${slot.horaFin}:00`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (end <= start) end += 24 * 60 * 60 * 1000
  return { id: slot.id, start, end, canchaId: slot.canchaId ?? null }
}

function occupancyInterval(occupancy: CourtOccupancy): Interval | null {
  const start = new Date(occupancy.fecha).getTime()
  const end = new Date(occupancy.fechaFin).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return { id: occupancy.id, start, end, canchaId: occupancy.canchaId }
}

function compareIntervals(left: Interval, right: Interval): number {
  return left.start - right.start || left.end - right.end || left.id.localeCompare(right.id)
}

export function planCourtAssignments(input: {
  mode: CourtMode
  canchas: { id: string }[]
  slots: TimeSlotConfig[]
  ocupaciones: CourtOccupancy[]
  /**
   * Canchas donde la división realmente juega. Restringe **solo** el reparto automático: la
   * ocupación se sigue leyendo de todas las canchas, para que un slot puesto a mano en una
   * cancha ajena siga reportando su choque en vez de volverse invisible. Vacío u omitido =
   * todas (ligas sin configuración por cancha).
   */
  assignableCourtIds?: string[]
}): CourtPlan {
  const courtIds = input.mode === "SINGLE"
    ? [VIRTUAL_COURT]
    : [...new Set(input.canchas.map((court) => court.id))].sort()
  const active = new Set(courtIds)
  const schedule = new Map(courtIds.map((id) => [id, [] as Interval[]]))
  const loads = new Map(courtIds.map((id) => [id, 0]))
  const byId = new Map(input.slots.map((slot) => [slot.id, { ...slot }]))
  const automatic: Interval[] = []
  const conflicts: CourtConflict[] = []
  const unassignedSlotIds: string[] = []

  for (const occupancy of input.ocupaciones) {
    const interval = occupancyInterval(occupancy)
    const courtId = input.mode === "SINGLE" ? VIRTUAL_COURT : occupancy.canchaId
    if (!interval || !courtId || !active.has(courtId)) continue
    schedule.get(courtId)!.push(interval)
    loads.set(courtId, loads.get(courtId)! + 1)
  }

  const drafts = input.slots.map(slotInterval).filter((item): item is Interval => !!item).sort(compareIntervals)
  for (const draft of drafts) {
    const manualCourt = input.mode === "MULTIPLE" ? draft.canchaId : null
    if (!manualCourt || !active.has(manualCourt)) {
      automatic.push(draft)
      continue
    }
    const blockers = schedule.get(manualCourt)!.filter((item) => halfOpenOverlaps(draft, item))
    if (blockers.length > 0) {
      conflicts.push({ slotId: draft.id, canchaId: manualCourt, blockerIds: blockers.map((item) => item.id).sort(), reason: "OVERLAP" })
    }
    schedule.get(manualCourt)!.push(draft)
    loads.set(manualCourt, loads.get(manualCourt)! + 1)
  }

  // Sin este filtro un slot sin cancha se iba a la cancha menos cargada de la liga — que suele
  // ser justamente una que la división no tiene configurada, por estar vacía. El backend después
  // rechaza esa jornada, y el conflicto real nunca se le muestra a nadie.
  const assignable = input.assignableCourtIds?.length
    ? courtIds.filter((courtId) => courtId === VIRTUAL_COURT || input.assignableCourtIds!.includes(courtId))
    : courtIds

  for (const draft of automatic) {
    const available = assignable
      .filter((courtId) => !schedule.get(courtId)!.some((item) => halfOpenOverlaps(draft, item)))
      .sort((left, right) => loads.get(left)! - loads.get(right)! || left.localeCompare(right))
    const courtId = available[0]
    const slot = byId.get(draft.id)!
    if (!courtId) {
      const blockerIds = assignable.flatMap((id) => schedule.get(id)!.filter((item) => halfOpenOverlaps(draft, item)).map((item) => item.id))
      conflicts.push({ slotId: draft.id, canchaId: null, blockerIds: [...new Set(blockerIds)].sort(), reason: "NO_CAPACITY" })
      unassignedSlotIds.push(draft.id)
      slot.canchaId = undefined
      continue
    }
    schedule.get(courtId)!.push(draft)
    loads.set(courtId, loads.get(courtId)! + 1)
    slot.canchaId = input.mode === "SINGLE" ? undefined : courtId
  }

  if (input.mode === "SINGLE") {
    for (const slot of byId.values()) slot.canchaId = undefined
  }

  return {
    slots: input.slots.map((slot) => byId.get(slot.id) ?? slot),
    conflicts,
    unassignedSlotIds,
    loads: Object.fromEntries(courtIds.filter((id) => id !== VIRTUAL_COURT).map((id) => [id, loads.get(id) ?? 0])),
  }
}

export function planFromAvailability(
  slots: TimeSlotConfig[],
  availability: CourtAvailability,
  assignableCourtIds?: string[],
): CourtPlan {
  return planCourtAssignments({
    mode: availability.mode,
    canchas: availability.canchas,
    slots,
    ocupaciones: availability.ocupaciones,
    assignableCourtIds,
  })
}

export function applyAutomaticCourtAssignments(
  slots: TimeSlotConfig[],
  plannedSlots: TimeSlotConfig[],
  activeCourtIds: string[],
): TimeSlotConfig[] {
  const active = new Set(activeCourtIds)
  const plannedById = new Map(plannedSlots.map((slot) => [slot.id, slot.canchaId]))

  return slots.map((slot) => {
    if (!plannedById.has(slot.id) || (slot.canchaId && active.has(slot.canchaId))) return slot
    const canchaId = plannedById.get(slot.id)
    return canchaId && active.has(canchaId)
      ? { ...slot, canchaId }
      : { ...slot, canchaId: undefined }
  })
}

/**
 * En modo `SINGLE` la liga tiene una sola cancha compartida: los partidos se guardan con
 * `canchaId: null` y no hay cancha que pasar, así que filtrar por id descartaba **todas** las
 * reservas y se colocaba encima de otra división. Igual que `planCourtAssignments` con su cancha
 * virtual, acá toda ocupación cuenta.
 */
export function isCourtOccupiedForSlot(
  slot: TimeSlotConfig,
  courtId: string | undefined,
  availability: CourtAvailability,
  draftSlots: TimeSlotConfig[],
): boolean {
  const target = slotInterval(slot)
  if (!target) return true
  const canchaUnica = availability.mode === "SINGLE"
  const occupied = availability.ocupaciones
    .filter((item) => canchaUnica || item.canchaId === courtId)
    .map(occupancyInterval)
    .filter((item): item is Interval => !!item)
  const drafts = draftSlots
    .filter((item) => item.id !== slot.id && (canchaUnica || item.canchaId === courtId))
    .map(slotInterval)
    .filter((item): item is Interval => !!item)
  return [...occupied, ...drafts].some((item) => halfOpenOverlaps(target, item))
}
