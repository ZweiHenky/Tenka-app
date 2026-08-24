import type { CourtScheduleRow } from "@/domain/interfaces/league"
import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"

/**
 * Cualquier lista de canchas sirve: la liga las trae con `activa`, y el endpoint de
 * disponibilidad ya devuelve solo las activas (sin el campo).
 */
export interface CourtRef {
  id: string
  activa?: boolean
}

export const DEFAULT_HORARIO = "08:00-20:00"
export const DEFAULT_DURACION = 60

/** Lo mínimo que el resolver necesita de una división; evita acoplar a la interfaz completa. */
export interface DivisionScheduleSource {
  diasPartido?: string | null
  horarioPartido?: string | null
  canchaHorarios?: CourtScheduleRow[]
}

export interface CourtSchedule {
  diasPartido: string
  horarioPartido: string
}

/**
 * Días y horario por cancha, con la misma regla que el backend (`utils/divisionSchedule.ts`):
 *
 *  1. Sin canchas (liga de cancha única) → una entrada `undefined` con los escalares.
 *  2. Con filas → una entrada por cancha configurada **y activa**. Sin entrada = no juega ahí.
 *  3. Sin filas → fallback legacy: todas las canchas activas heredan los escalares,
 *
 * Es la única función que decide dónde juega una división: `division.horarioPartido` es solo
 * un resumen (unión) cuando hay filas, y usarlo directo permitiría colocar un partido en una
 * cancha que no lo acepta.
 */
export function resolveCourtSchedules(
  division: DivisionScheduleSource | null | undefined,
  canchas: CourtRef[],
): Map<string | undefined, CourtSchedule> {
  const resolved = new Map<string | undefined, CourtSchedule>()
  const scalar: CourtSchedule = {
    diasPartido: division?.diasPartido ?? "",
    horarioPartido: division?.horarioPartido ?? DEFAULT_HORARIO,
  }

  const activeIds = canchas.filter((court) => court.activa !== false).map((court) => court.id)
  // With no court list we cannot filter by active, so the rows are taken as-is. Callers that
  // only need the day/time grid (e.g. the day tabs) use this; placement always passes the list.
  const activeSet = activeIds.length > 0 ? new Set(activeIds) : null
  const rows = (division?.canchaHorarios ?? []).filter((row) => !activeSet || activeSet.has(row.canchaId))
  if (activeIds.length === 0 && rows.length === 0) {
    resolved.set(undefined, scalar)
    return resolved
  }

  if (rows.length > 0) {
    for (const row of rows) {
      resolved.set(row.canchaId, { diasPartido: row.diasPartido, horarioPartido: row.horarioPartido })
    }
    return resolved
  }

  for (const courtId of activeIds) {
    resolved.set(courtId, scalar)
  }
  return resolved
}

/**
 * Horario de una cancha concreta. Cae al resumen de la división cuando esa cancha no está
 * configurada, para que quien solo necesita una grilla de horarios no reciba una lista vacía;
 * quien deba respetar el opt-out consulta `resolveCourtSchedules` y verifica la ausencia.
 */
export function scheduleForCourt(
  division: DivisionScheduleSource | null | undefined,
  canchas: CourtRef[],
  canchaId: string | undefined,
): CourtSchedule {
  const resolved = resolveCourtSchedules(division, canchas)
  return resolved.get(canchaId)
    ?? resolved.get(undefined)
    ?? {
      diasPartido: division?.diasPartido ?? "",
      horarioPartido: division?.horarioPartido ?? DEFAULT_HORARIO,
    }
}

/**
 * Días que una cancha concreta juega. Un conjunto vacío significa "sin restricción conocida"
 * (no hay días configurados), no "no juega ningún día".
 */
export function playDaysForCourt(
  division: DivisionScheduleSource | null | undefined,
  canchas: CourtRef[],
  canchaId: string | undefined,
): Set<number> {
  return new Set(parseDiasPartido(scheduleForCourt(division, canchas, canchaId).diasPartido))
}

/** Unión de los días de todas las canchas configuradas: los días que la división juega en algún lado. */
export function unionOfPlayDays(
  division: DivisionScheduleSource | null | undefined,
  canchas: CourtRef[] = [],
): number[] {
  const days = new Set<number>()
  for (const schedule of resolveCourtSchedules(division, canchas).values()) {
    for (const day of parseDiasPartido(schedule.diasPartido)) days.add(day)
  }
  return [...days].sort((a, b) => a - b)
}
