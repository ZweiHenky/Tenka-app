import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"

export interface TimeSlotConfig {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  equipoLocalId?: string
  equipoVisitanteId?: string
  tipo?: 'regular' | 'complemento' | 'amistoso' | 'eliminatoria'
  canchaId?: string
  partidoId?: string
  rondaNombre?: string
  llave?: number
  prePlayoffTipo?: 'regular' | 'complemento'
}

export interface PlantillaSlot {
  diaSemana: number
  horaInicio: string
  horaFin: string
  tipo?: TimeSlotConfig['tipo']
  canchaId?: string
}

export interface DivisionSchedule {
  divisionId: string
  slots: TimeSlotConfig[]
  plantilla?: PlantillaSlot[]
  refDate?: string
  horarioSnapshot?: string
  diasSnapshot?: string
  duracionSnapshot?: number
  descansoSnapshot?: number
  descansoEquipoId?: string
  playoffMode?: boolean
  canchaUnicaIdSnapshot?: string | null
}

interface DivisionScheduleState {
  schedules: Record<string, DivisionSchedule>
  habilitados: Record<string, string[]>
  programacionGuardada: Record<string, boolean>
  initSchedule: (divisionId: string, diasPartido: string, horarioPartido: string, duracionPartido: number, descanso: number, refDate?: string, maxSlots?: number, habilitados?: string[], courtIds?: string[], canchaUnicaId?: string | null) => void
  getSchedule: (divisionId: string) => DivisionSchedule | undefined
  setSlotTeams: (divisionId: string, slotId: string, localId?: string, visitanteId?: string) => void
  setSlotTipo: (divisionId: string, slotId: string, tipo: 'regular' | 'complemento' | 'amistoso' | 'eliminatoria') => void
  setSlotCancha: (divisionId: string, slotId: string, canchaId: string | undefined) => void
  setAllSlotsCancha: (divisionId: string, canchaId: string) => void
  setSlotPartido: (divisionId: string, slotId: string, data: { partidoId?: string; equipoLocalId?: string; equipoVisitanteId?: string; rondaNombre?: string; llave?: number }) => void
  setScheduleTipoSlots: (divisionId: string, slots: TimeSlotConfig[]) => void
  replaceSlots: (divisionId: string, slots: TimeSlotConfig[]) => void
  syncCanchaUnica: (divisionId: string, canchaUnicaId: string | null, slots: TimeSlotConfig[]) => void
  clearEliminatoriaSlots: (divisionId: string) => void
  clearExtraSlots: (divisionId: string) => void
  resetSchedule: (divisionId: string) => void
  setDescansoEquipoId: (divisionId: string, equipoId: string | undefined) => void
  clearSlot: (divisionId: string, slotId: string) => void
  addSlot: (divisionId: string, tipo: 'regular' | 'amistoso' | 'complemento') => TimeSlotConfig | null
  removeSlot: (divisionId: string, slotId: string) => void
  moveSlotToDay: (divisionId: string, slotId: string, newFecha: string) => boolean
  moveSlotToTime: (divisionId: string, slotId: string, newHoraInicio: string, newHoraFin: string) => boolean
  setPlayoffMode: (divisionId: string, active: boolean) => void
  setHabilitados: (divisionId: string, equipoIds: string[]) => void
  guardarProgramacion: (divisionId: string) => void
  advanceSchedule: (divisionId: string, lastJornadaFechaInicio?: string | null) => void
  rewindSchedule: (divisionId: string) => void
  clearScheduleTeams: (divisionId: string) => void
  hasUnsaved: boolean
}

function parseHorario(horario: string): { inicio: string; fin: string }[] {
  if (!horario) return []
  return horario.split(" / ").map((r) => {
    let parts = r.split(" - ").map((s) => s.trim())
    if (parts.length === 2) return { inicio: parts[0], fin: parts[1] }
    parts = r.split("-").map((s) => s.trim())
    if (parts.length === 2) return { inicio: parts[0], fin: parts[1] }
    return null
  }).filter(Boolean) as { inicio: string; fin: string }[]
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}

function getDayOfWeek(fecha: string): number {
  if (!isValidDateStr(fecha)) return 1
  const [y, m, d] = fecha.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function isValidDateStr(s: string): boolean {
  if (!s || typeof s !== 'string') return false
  const match = s.match(/^\d{4}-\d{2}-\d{2}$/)
  if (!match) return false
  const [y, m, d] = s.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function localDateFromString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function sameWeek(a: string, b: string): boolean {
  const getMon = (s: string) => {
    const date = localDateFromString(s)
    const day = date.getDay()
    date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
    return formatDate(date)
  }
  return getMon(a) === getMon(b)
}

function getMondayOfThisWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function nextMondayFrom(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysUntilMonday)
  return d
}

export function sortValidDays(days: number[]): number[] {
  return [...days].sort((a, b) => {
    const na = a === 0 ? 7 : a
    const nb = b === 0 ? 7 : b
    return na - nb
  })
}

export function isSlotAuto(sl: TimeSlotConfig): boolean {
  return sl.id.startsWith('slot-')
}

export function isSlotManual(sl: TimeSlotConfig): boolean {
  return sl.id.startsWith('extra-')
}

export function normalizePlayoffSlotTypes(slots: TimeSlotConfig[]): TimeSlotConfig[] {
  return slots.map((slot) => {
    if (slot.tipo === 'eliminatoria' || slot.tipo === 'amistoso') return slot
    const prePlayoffTipo = slot.prePlayoffTipo ?? (slot.tipo === 'complemento' ? 'complemento' : 'regular')
    return { ...slot, tipo: 'amistoso', prePlayoffTipo }
  })
}

export function ensureUniqueSlotIds(slots: TimeSlotConfig[]): TimeSlotConfig[] {
  const reservedEliminatoriaIds = new Set(
    slots.filter((slot) => slot.tipo === 'eliminatoria' && slot.partidoId).map((slot) => `elim-${slot.partidoId}`),
  )
  const usedIds = new Set<string>()
  const seenEliminatoria = new Set<string>()
  const signatures = new Map<string, string>()
  let repairedIndex = 0
  const result: TimeSlotConfig[] = []

  for (const original of slots) {
    if (original.tipo === 'eliminatoria' && original.partidoId) {
      if (seenEliminatoria.has(original.partidoId)) continue
      seenEliminatoria.add(original.partidoId)
    }

    const slot = { ...original }
    const canonicalEliminatoriaId = slot.tipo === 'eliminatoria' && slot.partidoId ? `elim-${slot.partidoId}` : null
    let id = canonicalEliminatoriaId ?? slot.id
    const signature = `${slot.fecha}|${slot.horaInicio}|${slot.horaFin}|${slot.tipo ?? 'regular'}|${slot.partidoId ?? ''}`

    if (!canonicalEliminatoriaId && (usedIds.has(id) || reservedEliminatoriaIds.has(id))) {
      if (usedIds.has(id) && signatures.get(id) === signature) continue
      const prefix = isSlotManual(slot) ? 'extra' : 'slot'
      do {
        id = `${prefix}-repaired-${repairedIndex++}`
      } while (usedIds.has(id) || reservedEliminatoriaIds.has(id))
    }

    slot.id = id
    usedIds.add(id)
    signatures.set(id, signature)
    result.push(slot)
  }

  return result
}

export interface PlayoffSlotCandidate {
  fecha: string
  horaInicio: string
  horaFin: string
}

export interface PendingPlayoffSlot {
  id: string
  rondaNombre: string
  llave: number
  equipoLocalId: string | null
  equipoVisitanteId: string | null
}

export function reconcilePlayoffSlots(
  slots: TimeSlotConfig[],
  newMatches: PendingPlayoffSlot[],
  targetAutoAmistosos: number,
  candidates: PlayoffSlotCandidate[],
): TimeSlotConfig[] {
  const playoffSlots = normalizePlayoffSlotTypes(slots)
  const autoAmistosos = playoffSlots.filter((slot) => slot.tipo === 'amistoso' && !isSlotManual(slot))
  const keptAutoAmistosos = new Set(autoAmistosos.slice(0, targetAutoAmistosos))
  const normalized = autoAmistosos.length > targetAutoAmistosos
    ? playoffSlots.filter((slot) => slot.tipo !== 'amistoso' || isSlotManual(slot) || keptAutoAmistosos.has(slot))
    : [...playoffSlots]

  const currentAutoCount = normalized.filter((slot) => slot.tipo === 'amistoso' && !isSlotManual(slot)).length
  const missingAutoCount = Math.max(0, targetAutoAmistosos - currentAutoCount)
  if (newMatches.length === 0 && missingAutoCount === 0) return ensureUniqueSlotIds(normalized)

  const occupied = new Set(normalized.map((slot) => `${slot.fecha}|${slot.horaInicio}`))
  const usedIds = new Set(normalized.map((slot) => slot.id))
  const added: TimeSlotConfig[] = []
  let candidateIndex = 0
  let slotId = 0

  const nextCandidate = () => {
    while (candidateIndex < candidates.length) {
      const candidate = candidates[candidateIndex++]
      if (!candidate) continue
      const key = `${candidate.fecha}|${candidate.horaInicio}`
      if (occupied.has(key)) continue
      occupied.add(key)
      return candidate
    }
    return null
  }

  for (const match of newMatches) {
    const candidate = nextCandidate()
    if (!candidate) break
    const id = `elim-${match.id}`
    usedIds.add(id)
    added.push({
      ...candidate,
      id,
      tipo: 'eliminatoria',
      partidoId: match.id,
      rondaNombre: match.rondaNombre,
      llave: match.llave,
      equipoLocalId: match.equipoLocalId ?? undefined,
      equipoVisitanteId: match.equipoVisitanteId ?? undefined,
    })
  }

  for (let i = 0; i < missingAutoCount; i++) {
    const candidate = nextCandidate()
    if (!candidate) break
    while (usedIds.has(`slot-${slotId}`)) slotId++
    const id = `slot-${slotId++}`
    usedIds.add(id)
    added.push({ ...candidate, id, tipo: 'amistoso' })
  }

  return ensureUniqueSlotIds([...normalized, ...added])
}

export function getActiveSlots(slots: TimeSlotConfig[], equipoCount: number, playoffMode?: boolean): TimeSlotConfig[] {
  const regLike: TimeSlotConfig[] = []
  const specials: TimeSlotConfig[] = []
  const elimSeen = new Set<string>()
  const eliminatorias: TimeSlotConfig[] = []

  for (const sl of slots) {
    if (sl.tipo === 'eliminatoria') {
      if (!sl.partidoId) continue
      if (elimSeen.has(sl.partidoId)) continue
      elimSeen.add(sl.partidoId)
      eliminatorias.push(sl)
    } else if (sl.tipo === 'complemento') {
      specials.push(sl)
    } else if (sl.tipo === 'amistoso' && (!playoffMode || isSlotManual(sl))) {
      specials.push(sl)
    } else {
      regLike.push(sl)
    }
  }

  const baseNeeded = Math.floor(equipoCount / 2)
  const needed = Math.max(0, baseNeeded - eliminatorias.length)

  return [...regLike.slice(0, needed), ...specials, ...eliminatorias]
}

export function resolveCanchaConflicts(slots: TimeSlotConfig[], schedule: DivisionSchedule): TimeSlotConfig[] {
  // Court conflicts are validation errors. Never hide them by moving a draft.
  void schedule
  return ensureUniqueSlotIds(slots)
}

export function computeRefDateFromJornada(fechaInicio: string | null | undefined): string | undefined {
  if (!fechaInicio) return undefined
  const datePart = fechaInicio.split("T")[0]
  const [y, m, d] = datePart.split("-").map(Number)
  const fecha = new Date(y, m - 1, d)
  if (isNaN(fecha.getTime())) return undefined
  const day = fecha.getDay()
  const diff = day === 0 ? -6 : 1 - day
  fecha.setDate(fecha.getDate() + diff)
  fecha.setDate(fecha.getDate() + 7)
  return formatDate(fecha)
}

export function generateSlots(diasPartido: string, horarioPartido: string, duracion: number, descanso: number, refDate?: string, maxSlots?: number, courtIds: string[] = []): TimeSlotConfig[] {
  const ranges = parseHorario(horarioPartido)
  if (ranges.length === 0) return []

  const validDays = parseDiasPartido(diasPartido)
  if (validDays.length === 0) return []

  const slotTotal = duracion + descanso

  const dayTimeSlots: { horaInicio: string; horaFin: string }[] = []
  for (const range of ranges) {
    let current = timeToMinutes(range.inicio)
    const finMin = timeToMinutes(range.fin)
    while (current + duracion <= finMin) {
      dayTimeSlots.push({
        horaInicio: minutesToTime(current),
        horaFin: minutesToTime(current + duracion),
      })
      current += slotTotal
    }
  }
  if (dayTimeSlots.length === 0) return []

  let ref: Date
  if (refDate && isValidDateStr(refDate)) {
    ref = localDateFromString(refDate)
  } else {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    ref = nextMondayFrom(tomorrow)
  }

  const weekMonday = getMondayOfThisWeek(ref)
  const slots: TimeSlotConfig[] = []
  if (maxSlots === 0) return slots

  const sortedDays = sortValidDays(validDays)

  for (const day of sortedDays) {
    if (slots.length >= (maxSlots ?? Infinity)) break
    const d = new Date(weekMonday)
    const offset = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() + offset)
    const fecha = formatDate(d)

    for (const ts of dayTimeSlots) {
      if (slots.length >= (maxSlots ?? Infinity)) break
      const capacity = courtIds.length > 0 ? courtIds : [undefined]
      for (const canchaId of capacity) {
        if (slots.length >= (maxSlots ?? Infinity)) break
        slots.push({ id: `slot-${slots.length}`, fecha, horaInicio: ts.horaInicio, horaFin: ts.horaFin, tipo: 'regular', canchaId })
      }
    }
  }

  return slots
}

export function migrateDivisionScheduleState(persisted: unknown) {
  const state = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<DivisionScheduleState>
  const schedules = Object.fromEntries(Object.entries(state.schedules ?? {}).map(([divisionId, schedule]) => {
    const sanitizedSlots = Array.isArray(schedule.slots) ? schedule.slots.map((slot) => ({
      ...slot,
      canchaId: typeof slot.canchaId === 'string' && slot.canchaId ? slot.canchaId : undefined,
    })) : []
    const playoffMode = schedule.playoffMode === true || sanitizedSlots.some((slot) => slot.tipo === 'eliminatoria')
    return [divisionId, {
      ...schedule,
      playoffMode,
      slots: playoffMode ? normalizePlayoffSlotTypes(sanitizedSlots) : sanitizedSlots,
      plantilla: Array.isArray(schedule.plantilla) ? schedule.plantilla.map((slot) => ({
        ...slot,
        canchaId: typeof slot.canchaId === 'string' && slot.canchaId ? slot.canchaId : undefined,
      })) : undefined,
    }]
  }))
  return { ...state, schedules }
}

export const useDivisionScheduleStore = create<DivisionScheduleState>()(
  persist(
    (set, get) => ({
  schedules: {},
  habilitados: {},
  programacionGuardada: {},
  hasUnsaved: false,

  initSchedule: (divisionId, diasPartido, horarioPartido, duracionPartido, descanso, refDate, maxSlots, habilitados, courtIds = [], canchaUnicaId = null) => {
    let existing = get().schedules[divisionId]

    // Collect eliminatoria slots before any repair
    const eliminatoriaSlots: TimeSlotConfig[] = []
    if (existing) {
      for (const sl of existing.slots) {
        if (sl.tipo === 'eliminatoria') {
          eliminatoriaSlots.push(sl)
        }
      }
    }

    // Repair corrupted NaN dates from previous ISO-timestamp parsing bug
    if (existing) {
      const hasCorruptedSlots = existing.slots.some(s => !isValidDateStr(s.fecha))
      const hasCorruptedRefDate = existing.refDate !== undefined && !isValidDateStr(existing.refDate)
      if (hasCorruptedSlots || hasCorruptedRefDate) {
        existing = {
          divisionId,
          slots: [],
          refDate: undefined,
          plantilla: undefined,
          horarioSnapshot: undefined,
          diasSnapshot: undefined,
          duracionSnapshot: undefined,
          descansoSnapshot: undefined,
          descansoEquipoId: undefined,
        }
      }
    }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    if (existing && existing.horarioSnapshot === horarioPartido && existing.diasSnapshot === diasPartido && existing.duracionSnapshot === duracionPartido && existing.descansoSnapshot === descanso) {
      const validDays = parseDiasPartido(diasPartido)
      const ranges = parseHorario(horarioPartido)

      const dayTimeSlots: { horaInicio: string; horaFin: string }[] = []
      const slotTotal = duracionPartido + descanso
      for (const range of ranges) {
        let current = timeToMinutes(range.inicio)
        const finMin = timeToMinutes(range.fin)
        while (current + duracionPartido <= finMin) {
          dayTimeSlots.push({ horaInicio: minutesToTime(current), horaFin: minutesToTime(current + duracionPartido) })
          current += slotTotal
        }
      }

      const refLocal = refDate && isValidDateStr(refDate) ? localDateFromString(refDate) : nextMondayFrom(tomorrow)
      const weekMonday = getMondayOfThisWeek(refLocal)

      const migratedPlantilla = existing.plantilla && existing.plantilla.length > 0
        ? existing.plantilla.map((sl) => {
            const old = sl as any
            return {
              diaSemana: old.diaSemana ?? (old.fecha ? getDayOfWeek(old.fecha) : 0),
              horaInicio: sl.horaInicio,
              horaFin: sl.horaFin,
              tipo: sl.tipo,
              canchaId: typeof old.canchaId === 'string' ? old.canchaId : undefined,
            } as PlantillaSlot
          })
        : undefined
      const rawTemplate = migratedPlantilla ?? existing.slots.filter((s) => s.tipo !== 'eliminatoria').map((s) => ({
          diaSemana: getDayOfWeek(s.fecha),
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          tipo: s.tipo,
          canchaId: s.canchaId,
        }))
      const templateCount = Math.min(rawTemplate.length, maxSlots ?? Infinity)
      const templateSlots = rawTemplate.slice(0, templateCount)
      const existingNonEliminatoriaSlots = existing.slots.filter((slot) => slot.tipo !== 'eliminatoria')

      const shifted: TimeSlotConfig[] = templateSlots.map((sl, idx) => {
        const d = new Date(weekMonday)
        const offset = sl.diaSemana === 0 ? 6 : sl.diaSemana - 1
        d.setDate(d.getDate() + offset)
        const existingSlot = existingNonEliminatoriaSlots[idx]
        return {
          id: existingSlot?.id ?? `slot-${idx}`,
          fecha: formatDate(d),
          horaInicio: sl.horaInicio,
          horaFin: sl.horaFin,
          tipo: sl.tipo ?? 'regular',
          equipoLocalId: existingSlot?.equipoLocalId,
          equipoVisitanteId: existingSlot?.equipoVisitanteId,
          canchaId: courtIds.includes(sl.canchaId ?? '') ? sl.canchaId : courtIds.includes(existingSlot?.canchaId ?? '') ? existingSlot?.canchaId : undefined,
        }
      })

      // Keep all team assignments regardless of habilitados; UI filters visibility
      const slotsWithHabilitados = shifted

      let slots: TimeSlotConfig[]

      if (slotsWithHabilitados.length >= (maxSlots ?? Infinity)) {
        slots = [...slotsWithHabilitados.slice(0, maxSlots ?? Infinity), ...eliminatoriaSlots]
      } else {
        const needed = (maxSlots ?? 0) - slotsWithHabilitados.length
        const occupied = new Map<string, Set<string>>()
        for (const sl of slotsWithHabilitados) {
          if (!occupied.has(sl.fecha)) occupied.set(sl.fecha, new Set())
          occupied.get(sl.fecha)!.add(sl.horaInicio)
        }

        const maxN = [...existing.slots, ...slotsWithHabilitados].reduce((m, sl) => {
          const n = parseInt(sl.id.replace('slot-', '').replace('extra-', ''), 10)
          return isNaN(n) ? m : Math.max(m, n)
        }, 0)
        let idCounter = maxN + 1
        const usedIds = new Set([...existing.slots, ...slotsWithHabilitados].map((slot) => slot.id))

        const newSlots: TimeSlotConfig[] = []
        const sortedDays = sortValidDays(validDays)

        for (const day of sortedDays) {
          if (newSlots.length >= needed) break
          const d = new Date(weekMonday)
          const offset = day === 0 ? 6 : day - 1
          d.setDate(d.getDate() + offset)
          const fecha = formatDate(d)
          const ocupados = occupied.get(fecha) ?? new Set()
          for (const ts of dayTimeSlots) {
            if (newSlots.length >= needed) break
            if (!ocupados.has(ts.horaInicio)) {
              ocupados.add(ts.horaInicio)
              while (usedIds.has(`slot-${idCounter}`)) idCounter++
              const id = `slot-${idCounter}`
              usedIds.add(id)
              newSlots.push({ id, fecha, horaInicio: ts.horaInicio, horaFin: ts.horaFin, tipo: existing?.playoffMode ? 'amistoso' : 'regular' })
              idCounter++
            }
          }
        }

        slots = [...slotsWithHabilitados, ...newSlots, ...eliminatoriaSlots]
      }

      if (existing?.playoffMode) slots = normalizePlayoffSlotTypes(slots)

      const nextSchedule: DivisionSchedule = { divisionId, slots, plantilla: migratedPlantilla, refDate: formatDate(weekMonday), horarioSnapshot: horarioPartido, diasSnapshot: diasPartido, duracionSnapshot: duracionPartido, descansoSnapshot: descanso, descansoEquipoId: existing?.descansoEquipoId, playoffMode: existing?.playoffMode ?? false, canchaUnicaIdSnapshot: canchaUnicaId }
      nextSchedule.slots = resolveCanchaConflicts(nextSchedule.slots, nextSchedule)
      set((s) => ({ schedules: { ...s.schedules, [divisionId]: nextSchedule }, hasUnsaved: false, programacionGuardada: { ...s.programacionGuardada, [divisionId]: false } }))
      return
    }

     const newSlots = generateSlots(diasPartido, horarioPartido, duracionPartido, descanso, refDate, maxSlots, courtIds)
    if (existing) {
      for (let i = 0; i < newSlots.length && i < existing.slots.length; i++) {
        newSlots[i].equipoLocalId = existing.slots[i].equipoLocalId
        newSlots[i].equipoVisitanteId = existing.slots[i].equipoVisitanteId
        newSlots[i].tipo = existing.slots[i].tipo
        if (courtIds.includes(existing.slots[i].canchaId ?? '')) newSlots[i].canchaId = existing.slots[i].canchaId
      }
      if (existing.playoffMode) newSlots.splice(0, newSlots.length, ...normalizePlayoffSlotTypes(newSlots))
    }
    const slots = [...newSlots, ...eliminatoriaSlots]
    const firstFecha = newSlots.length > 0 ? newSlots[0].fecha : undefined
    const refDateForStore = firstFecha && isValidDateStr(firstFecha)
      ? formatDate(getMondayOfThisWeek(localDateFromString(firstFecha)))
      : refDate && isValidDateStr(refDate)
        ? formatDate(getMondayOfThisWeek(localDateFromString(refDate)))
        : existing?.refDate
    const nextSchedule: DivisionSchedule = { divisionId, slots, plantilla: undefined, refDate: refDateForStore, horarioSnapshot: horarioPartido, diasSnapshot: diasPartido, duracionSnapshot: duracionPartido, descansoSnapshot: descanso, descansoEquipoId: existing?.descansoEquipoId, playoffMode: existing?.playoffMode ?? false, canchaUnicaIdSnapshot: canchaUnicaId }
    nextSchedule.slots = resolveCanchaConflicts(nextSchedule.slots, nextSchedule)
    set((s) => ({ schedules: { ...s.schedules, [divisionId]: nextSchedule }, hasUnsaved: false, programacionGuardada: { ...s.programacionGuardada, [divisionId]: false } }))
  },

  getSchedule: (divisionId) => {
    return get().schedules[divisionId]
  },

  setSlotTeams: (divisionId, slotId, localId, visitanteId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      let changed = false
      const slots = schedule.slots.map((sl) => {
        if (sl.id !== slotId) return sl
        if (sl.equipoLocalId === localId && sl.equipoVisitanteId === visitanteId) return sl
        changed = true
        return { ...sl, equipoLocalId: localId, equipoVisitanteId: visitanteId }
      })
      if (!changed) return s
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  setSlotTipo: (divisionId, slotId, tipo) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      if (schedule.playoffMode && (tipo === 'regular' || tipo === 'complemento')) return s
      let changed = false
      const slots = schedule.slots.map((sl) => {
        if (sl.id !== slotId) return sl
        if (sl.tipo === tipo) return sl
        changed = true
        return { ...sl, tipo }
      })
      if (!changed) return s
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  setSlotCancha: (divisionId, slotId, canchaId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const slots = schedule.slots.map((sl) =>
        sl.id === slotId ? { ...sl, canchaId } : sl
      )
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  setAllSlotsCancha: (divisionId, canchaId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const slots: TimeSlotConfig[] = schedule.slots.map((sl) => ({ ...sl, canchaId }))
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  setSlotPartido: (divisionId, slotId, data) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const slots = schedule.slots.map((sl) =>
        sl.id === slotId ? { ...sl, ...data } : sl
      )
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  syncCanchaUnica: (divisionId, canchaUnicaId, slots) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const normalizedSlots = schedule.playoffMode ? normalizePlayoffSlotTypes(slots) : slots
      return {
        schedules: {
          ...s.schedules,
          [divisionId]: {
            ...schedule,
            slots: normalizedSlots,
            plantilla: undefined,
            canchaUnicaIdSnapshot: canchaUnicaId,
          },
        },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  setScheduleTipoSlots: (divisionId, newSlots) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const normalized = newSlots.map((sl) =>
        sl.tipo === 'eliminatoria' && sl.partidoId ? { ...sl, id: `elim-${sl.partidoId}` } : sl
      )
      // Remove existing eliminatoria slots before adding normalized ones
      const noElim = schedule.slots.filter((sl) => sl.tipo !== 'eliminatoria')
      const regulars = noElim.filter((sl) => !sl.tipo || sl.tipo === 'regular')
      const other = noElim.filter((sl) => sl.tipo && sl.tipo !== 'regular')
      const keepRegular = Math.max(0, regulars.length - normalized.length)
      const replacedRegulars = regulars.slice(keepRegular)
      const replacementSlots = normalized.map((sl, index) => {
        const replaced = replacedRegulars[index]
        if (!replaced) return sl
        return {
          ...sl,
          fecha: replaced.fecha,
          horaInicio: replaced.horaInicio,
          horaFin: replaced.horaFin,
          canchaId: sl.canchaId ?? replaced.canchaId,
        }
      })
      const activatingPlayoffs = normalized.some((slot) => slot.tipo === 'eliminatoria')
      const mergedSlots = [...regulars.slice(0, keepRegular), ...other, ...replacementSlots]
      const slots = resolveCanchaConflicts(activatingPlayoffs ? normalizePlayoffSlotTypes(mergedSlots) : mergedSlots, schedule)
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, plantilla: undefined, playoffMode: activatingPlayoffs || schedule.playoffMode } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  replaceSlots: (divisionId, newSlots) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      let normalized = newSlots.map((sl) =>
        sl.tipo === 'eliminatoria' && sl.partidoId ? { ...sl, id: `elim-${sl.partidoId}` } : sl
      )
      if (schedule.playoffMode) normalized = normalizePlayoffSlotTypes(normalized)
      // Separate dedup namespaces: eliminatoria by partidoId, others by id
      const eliminatorias = normalized.filter((sl) => sl.tipo === 'eliminatoria')
      const others = normalized.filter((sl) => sl.tipo !== 'eliminatoria')
      const seenElim = new Set<string>()
      const dedupedElim = eliminatorias.filter((sl) => {
        if (!sl.partidoId || seenElim.has(sl.partidoId)) return false
        seenElim.add(sl.partidoId)
        return true
      })
      const seenOther = new Set<string>()
      const dedupedOthers = others.filter((sl) => {
        if (seenOther.has(sl.id)) return false
        seenOther.add(sl.id)
        return true
      })
      const deduped = resolveCanchaConflicts([...dedupedOthers, ...dedupedElim], schedule)
      if (deduped.length === schedule.slots.length && deduped.every((d, i) => {
        const o = schedule.slots[i]
        return d.id === o.id && d.fecha === o.fecha && d.horaInicio === o.horaInicio && d.horaFin === o.horaFin && d.equipoLocalId === o.equipoLocalId && d.equipoVisitanteId === o.equipoVisitanteId && d.tipo === o.tipo && d.canchaId === o.canchaId && d.partidoId === o.partidoId && d.rondaNombre === o.rondaNombre
      })) return s
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots: deduped } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  clearEliminatoriaSlots: (divisionId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      if (!schedule.slots.some((sl) => sl.tipo === 'eliminatoria')) return s
      const slots = schedule.slots.filter((sl) => sl.tipo !== 'eliminatoria')
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  clearExtraSlots: (divisionId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const slots = schedule.slots.filter((sl) => sl.tipo !== 'amistoso' && sl.tipo !== 'complemento')
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots } },
      }
    })
  },

  clearScheduleTeams: (divisionId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      return {
        schedules: {
          ...s.schedules,
          [divisionId]: {
            ...schedule,
            slots: schedule.slots.map((sl) =>
              sl.tipo !== 'eliminatoria'
                ? { ...sl, equipoLocalId: undefined, equipoVisitanteId: undefined, partidoId: undefined, rondaNombre: undefined, llave: undefined }
                : sl
            ),
            descansoEquipoId: undefined,
          }
        },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  resetSchedule: (divisionId) => {
    set((s) => {
      const nuevo = {
        divisionId,
        slots: [],
        plantilla: undefined,
        refDate: undefined,
        horarioSnapshot: undefined,
        diasSnapshot: undefined,
        duracionSnapshot: undefined,
        descansoSnapshot: undefined,
        descansoEquipoId: undefined,
      }
      return {
        schedules: { ...s.schedules, [divisionId]: nuevo },
        habilitados: { ...s.habilitados, [divisionId]: [] },
        hasUnsaved: false,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  setPlayoffMode: (divisionId, active) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      if (active) {
        let slots = normalizePlayoffSlotTypes(schedule.slots)
        if (schedule.playoffMode && slots.every((slot, index) => slot === schedule.slots[index])) return s
        slots = resolveCanchaConflicts(slots, schedule)
        return {
          schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, playoffMode: true } },
          hasUnsaved: true,
          programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
        }
      }

      if (!schedule.playoffMode) return s

      let slots: TimeSlotConfig[] = schedule.slots.map((sl) => {
        if (sl.prePlayoffTipo) {
          const { prePlayoffTipo, ...rest } = sl
          return { ...rest, tipo: prePlayoffTipo }
        }
        // Compatibility for schedules persisted before prePlayoffTipo existed.
        if (sl.tipo === 'amistoso' && isSlotAuto(sl)) return { ...sl, tipo: 'regular' }
        return sl
      })

      const targetRegularSlots = Math.floor((s.habilitados[divisionId]?.length ?? 0) / 2)
      let regularCount = slots.filter((sl) => (sl.tipo ?? 'regular') === 'regular').length
      if (regularCount < targetRegularSlots && schedule.diasSnapshot && schedule.horarioSnapshot && schedule.duracionSnapshot) {
        const generated = generateSlots(
          schedule.diasSnapshot,
          schedule.horarioSnapshot,
          schedule.duracionSnapshot,
          schedule.descansoSnapshot ?? 0,
          schedule.refDate,
        )
        const occupied = new Set(slots.map((sl) => `${sl.fecha}-${sl.horaInicio}-${sl.horaFin}`))
        const ids = new Set(slots.map((sl) => sl.id))
        let restoredId = 0
        for (const candidate of generated) {
          if (regularCount >= targetRegularSlots) break
          const key = `${candidate.fecha}-${candidate.horaInicio}-${candidate.horaFin}`
          if (occupied.has(key)) continue
          while (ids.has(`slot-restored-${restoredId}`)) restoredId++
          const restored = { ...candidate, id: `slot-restored-${restoredId++}`, tipo: 'regular' as const }
          slots.push(restored)
          ids.add(restored.id)
          occupied.add(key)
          regularCount++
        }
      }
      slots = resolveCanchaConflicts(slots, schedule)
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, playoffMode: false } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  setDescansoEquipoId: (divisionId, equipoId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, descansoEquipoId: equipoId } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  clearSlot: (divisionId, slotId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const target = schedule.slots.find((sl) => sl.id === slotId)
      if (!target || target.tipo === 'eliminatoria') return s
      let changed = false
      const slots = schedule.slots.map((sl) => {
        if (sl.id !== slotId) return sl
        if (!sl.equipoLocalId && !sl.equipoVisitanteId) return sl
        changed = true
        return { ...sl, equipoLocalId: undefined, equipoVisitanteId: undefined }
      })
      if (!changed) return s
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  addSlot: (divisionId, tipo) => {
    const schedule = get().schedules[divisionId]
    if (!schedule) return null
    if (schedule.playoffMode && (tipo === 'regular' || tipo === 'complemento')) return null

    let diasStr = schedule.diasSnapshot ?? ''
    let horarioStr = schedule.horarioSnapshot ?? ''
    let duracion = schedule.duracionSnapshot
    let descanso = schedule.descansoSnapshot ?? 0

    if (schedule.slots.length > 0) {
      const hourMins = schedule.slots.map(s => timeToMinutes(s.horaInicio)).filter(m => !isNaN(m))
      const hourMaxs = schedule.slots.map(s => timeToMinutes(s.horaFin)).filter(m => !isNaN(m))
      if (!horarioStr && hourMins.length > 0 && hourMaxs.length > 0) {
        horarioStr = `${minutesToTime(Math.min(...hourMins))} - ${minutesToTime(Math.max(...hourMaxs))}`
      }
      if (!duracion && hourMins.length > 0 && hourMaxs.length > 0) {
        const diffs = hourMins.map((_, i) => hourMaxs[i] - hourMins[i]).filter(d => d > 0)
        duracion = diffs.length > 0 ? Math.min(...diffs) : 60
      }
      if (!diasStr) {
        const days = [...new Set(schedule.slots.map(s => {
          const [y, m, d] = s.fecha.split('-').map(Number)
          return new Date(y, m - 1, d).getDay()
        }))].sort()
        if (days.length > 0) {
          const names = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
          diasStr = days.map(d => names[d]).join(', ')
        }
      }
    }

    const validDays = parseDiasPartido(diasStr)
    if (validDays.length === 0 || !horarioStr || !duracion) return null

    const ranges = parseHorario(horarioStr)
    const dayTimeSlots: { horaInicio: string; horaFin: string }[] = []
    const slotTotal = duracion + descanso
    for (const range of ranges) {
      let current = timeToMinutes(range.inicio)
      const finMin = timeToMinutes(range.fin)
      while (current + duracion <= finMin) {
        dayTimeSlots.push({ horaInicio: minutesToTime(current), horaFin: minutesToTime(current + duracion) })
        current += slotTotal
      }
    }
    if (dayTimeSlots.length === 0) return null

    let refDate: Date
    if (schedule.refDate && isValidDateStr(schedule.refDate)) {
      refDate = localDateFromString(schedule.refDate)
    } else {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      refDate = nextMondayFrom(tomorrow)
    }
    const weekMonday = getMondayOfThisWeek(refDate)

    const occupiedIntervals = new Map<string, { inicio: number; fin: number }[]>()
    for (const sl of schedule.slots) {
      if (!sl.horaInicio || !sl.horaFin) continue
      if (!occupiedIntervals.has(sl.fecha)) occupiedIntervals.set(sl.fecha, [])
      occupiedIntervals.get(sl.fecha)!.push({
        inicio: timeToMinutes(sl.horaInicio),
        fin: timeToMinutes(sl.horaFin),
      })
    }

    const overlapsExisting = (fecha: string, inicio: string, fin: string): boolean => {
      const nStart = timeToMinutes(inicio)
      const nEnd = timeToMinutes(fin)
      const intervals = occupiedIntervals.get(fecha)
      if (!intervals) return false
      return intervals.some((iv) => nStart < iv.fin && nEnd > iv.inicio)
    }

    const sortedDays = sortValidDays(validDays)
    let foundFecha: string | null = null
    let foundHoraInicio = ''
    let foundHoraFin = ''

    for (const day of sortedDays) {
      const d = new Date(weekMonday)
      const offset = day === 0 ? 6 : day - 1
      d.setDate(d.getDate() + offset)
      const fecha = formatDate(d)

      for (const ts of dayTimeSlots) {
        if (!overlapsExisting(fecha, ts.horaInicio, ts.horaFin)) {
          foundFecha = fecha
          foundHoraInicio = ts.horaInicio
          foundHoraFin = ts.horaFin
          break
        }
      }
      if (foundFecha) break
    }

    if (!foundFecha) return null

    const maxN = schedule.slots.reduce((m, sl) => {
      const n = parseInt(sl.id.replace('slot-', '').replace('extra-', ''), 10)
      return isNaN(n) ? m : Math.max(m, n)
    }, 0)

    const newSlot: TimeSlotConfig = {
      id: `extra-${maxN + 1}`,
      fecha: foundFecha,
      horaInicio: foundHoraInicio,
      horaFin: foundHoraFin,
      tipo: schedule.playoffMode && (tipo === 'regular' || tipo === 'complemento') ? 'amistoso' : tipo,
    }

    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots: [...schedule.slots, newSlot], plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })

    return newSlot
  },

  removeSlot: (divisionId, slotId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const slot = schedule.slots.find((sl) => sl.id === slotId)
      if (!slot || slot.tipo === 'eliminatoria') return s
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots: schedule.slots.filter((sl) => sl.id !== slotId), plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  moveSlotToDay: (divisionId, slotId, newFecha) => {
    const schedule = get().schedules[divisionId]
    if (!schedule) return false
    const slot = schedule.slots.find((sl) => sl.id === slotId)
    if (!slot) return false
    if (!sameWeek(slot.fecha, newFecha)) return false

    const conflicting = schedule.slots.find(
      (sl) => {
        if (sl.id === slotId || sl.fecha !== newFecha || sl.canchaId !== slot.canchaId) return false
        if (!sl.horaInicio || !sl.horaFin || !slot.horaInicio || !slot.horaFin) return false
        const aStart = timeToMinutes(slot.horaInicio)
        const aEnd = timeToMinutes(slot.horaFin)
        const bStart = timeToMinutes(sl.horaInicio)
        const bEnd = timeToMinutes(sl.horaFin)
        return aStart < bEnd && aEnd > bStart
      },
    )
    if (conflicting) return false

    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const slots = schedule.slots.map((sl) =>
        sl.id === slotId ? { ...sl, fecha: newFecha } : sl
      )
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
    return true
  },

  setHabilitados: (divisionId, equipoIds) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (schedule && !schedule.playoffMode && equipoIds.length > 0 && equipoIds.length % 2 !== 0 && schedule.plantilla) {
        const needsRestore = schedule.slots.some((sl, i) => {
          const tmpl = schedule.plantilla![i]
          return tmpl && tmpl.tipo === 'complemento' && (sl.tipo ?? 'regular') !== 'complemento'
        })
        if (needsRestore) {
          const slots = schedule.slots.map((sl, i) => {
            const tmpl = schedule.plantilla![i]
            if (tmpl && tmpl.tipo === 'complemento') {
              return { ...sl, tipo: 'complemento' as const }
            }
            return sl
          })
          return {
            habilitados: { ...s.habilitados, [divisionId]: equipoIds },
            schedules: { ...s.schedules, [divisionId]: { ...schedule, slots } },
            programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
          }
        }
      }
      return { habilitados: { ...s.habilitados, [divisionId]: equipoIds }, programacionGuardada: { ...s.programacionGuardada, [divisionId]: false } }
    })
  },

  guardarProgramacion: (divisionId) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return { programacionGuardada: { ...s.programacionGuardada, [divisionId]: true }, hasUnsaved: false }
      return {
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: true },
        hasUnsaved: false,
        schedules: {
          ...s.schedules,
          [divisionId]: {
            ...schedule,
            plantilla: schedule.slots
              .filter((sl) => sl.tipo !== 'eliminatoria')
              .map((sl) => ({
                diaSemana: getDayOfWeek(sl.fecha),
                horaInicio: sl.horaInicio,
                horaFin: sl.horaFin,
                tipo: sl.tipo,
                canchaId: sl.canchaId,
              })),
          },
        },
      }
    })
  },

  advanceSchedule: (divisionId, lastJornadaFechaInicio) => {
    const schedule = get().schedules[divisionId]
    if (!schedule) return

    const weekMonday = lastJornadaFechaInicio
      ? (() => {
          const refDate = computeRefDateFromJornada(lastJornadaFechaInicio)
          return refDate && isValidDateStr(refDate) ? localDateFromString(refDate) : nextMondayFrom(new Date())
        })()
      : nextMondayFrom(new Date())

    const slots = schedule.slots.map((sl) => {
      if (!isValidDateStr(sl.fecha)) return sl
      const oldDate = localDateFromString(sl.fecha)
      const dayOfWeek = oldDate.getDay()
      const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const newDate = new Date(weekMonday)
      newDate.setDate(newDate.getDate() + offset)
      return { ...sl, fecha: formatDate(newDate) }
    })

    set((s) => ({
      schedules: {
        ...s.schedules,
        [divisionId]: {
          ...schedule,
          slots,
          refDate: formatDate(weekMonday),
          descansoEquipoId: undefined,
        },
      },
      hasUnsaved: false,
      programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
    }))
  },

  rewindSchedule: (divisionId) => {
    const schedule = get().schedules[divisionId]
    if (!schedule || schedule.slots.length === 0) return

    const slots = schedule.slots.map((sl) => {
      if (!isValidDateStr(sl.fecha)) return sl
      const oldDate = localDateFromString(sl.fecha)
      oldDate.setDate(oldDate.getDate() - 7)
      return { ...sl, fecha: formatDate(oldDate) }
    })
    const prevMonday = schedule.refDate && isValidDateStr(schedule.refDate)
      ? formatDate(new Date(localDateFromString(schedule.refDate).getTime() - 7 * 86400000))
      : undefined

    set((s) => ({
      schedules: {
        ...s.schedules,
        [divisionId]: {
          ...schedule,
          slots,
          refDate: prevMonday,
          descansoEquipoId: undefined,
        },
      },
      hasUnsaved: false,
      programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
    }))
  },

  moveSlotToTime: (divisionId, slotId, newHoraInicio, newHoraFin) => {
    const schedule = get().schedules[divisionId]
    if (!schedule) return false
    const slot = schedule.slots.find((sl) => sl.id === slotId)
    if (!slot) return false

    const conflicting = schedule.slots.find(
      (sl) => {
        if (sl.id === slotId || sl.fecha !== slot.fecha || sl.canchaId !== slot.canchaId) return false
        if (!sl.horaInicio || !sl.horaFin) return false
        const sStart = timeToMinutes(sl.horaInicio)
        const sEnd = timeToMinutes(sl.horaFin)
        const nStart = timeToMinutes(newHoraInicio)
        const nEnd = timeToMinutes(newHoraFin)
        return nStart < sEnd && nEnd > sStart
      },
    )

    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      let slots: TimeSlotConfig[]
      if (conflicting) {
        slots = schedule.slots.map((sl) => {
          if (sl.id === slotId) return { ...sl, horaInicio: newHoraInicio, horaFin: newHoraFin }
          if (sl.id === conflicting.id) return { ...sl, horaInicio: slot.horaInicio, horaFin: slot.horaFin }
          return sl
        })
      } else {
        slots = schedule.slots.map((sl) =>
          sl.id === slotId ? { ...sl, horaInicio: newHoraInicio, horaFin: newHoraFin } : sl
        )
      }
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
    return true
  },
}),
    {
      name: "division-schedule-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      migrate: migrateDivisionScheduleState,
      partialize: (state) => ({ habilitados: state.habilitados, schedules: state.schedules, programacionGuardada: state.programacionGuardada }),
    },
  ),
)
