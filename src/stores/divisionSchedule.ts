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
}

export interface PlantillaSlot {
  diaSemana: number
  horaInicio: string
  horaFin: string
  tipo?: string
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
}

interface DivisionScheduleState {
  schedules: Record<string, DivisionSchedule>
  habilitados: Record<string, string[]>
  programacionGuardada: Record<string, boolean>
  initSchedule: (divisionId: string, diasPartido: string, horarioPartido: string, duracionPartido: number, descanso: number, refDate?: string, maxSlots?: number, habilitados?: string[]) => void
  getSchedule: (divisionId: string) => DivisionSchedule | undefined
  setSlotTeams: (divisionId: string, slotId: string, localId?: string, visitanteId?: string) => void
  setSlotTipo: (divisionId: string, slotId: string, tipo: 'regular' | 'complemento' | 'amistoso' | 'eliminatoria') => void
  setSlotCancha: (divisionId: string, slotId: string, canchaId: string | undefined) => void
  setAllSlotsCancha: (divisionId: string, canchaId: string) => void
  setSlotPartido: (divisionId: string, slotId: string, data: { partidoId?: string; equipoLocalId?: string; equipoVisitanteId?: string; rondaNombre?: string; llave?: number }) => void
  setScheduleTipoSlots: (divisionId: string, slots: TimeSlotConfig[]) => void
  replaceSlots: (divisionId: string, slots: TimeSlotConfig[]) => void
  clearEliminatoriaSlots: (divisionId: string) => void
  resetSchedule: (divisionId: string) => void
  setDescansoEquipoId: (divisionId: string, equipoId: string | undefined) => void
  clearSlot: (divisionId: string, slotId: string) => void
  addSlot: (divisionId: string, tipo: 'regular' | 'amistoso' | 'complemento') => void
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
    const [y, m, d] = s.split("-").map(Number)
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

export function generateSlots(diasPartido: string, horarioPartido: string, duracion: number, descanso: number, refDate?: string, maxSlots?: number): TimeSlotConfig[] {
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
      slots.push({ id: `slot-${slots.length}`, fecha, horaInicio: ts.horaInicio, horaFin: ts.horaFin, tipo: 'regular' })
    }
  }

  return slots
}

export const useDivisionScheduleStore = create<DivisionScheduleState>()(
  persist(
    (set, get) => ({
  schedules: {},
  habilitados: {},
  programacionGuardada: {},
  hasUnsaved: false,

  initSchedule: (divisionId, diasPartido, horarioPartido, duracionPartido, descanso, refDate, maxSlots, habilitados) => {
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
            } as PlantillaSlot
          })
        : undefined
      const rawTemplate = migratedPlantilla ?? existing.slots.filter((s) => s.tipo !== 'eliminatoria').map((s) => ({
          diaSemana: getDayOfWeek(s.fecha),
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          tipo: s.tipo,
        }))
      const templateCount = Math.min(rawTemplate.length, maxSlots ?? Infinity)
      const templateSlots = rawTemplate.slice(0, templateCount)

      const shifted = templateSlots.map((sl, idx) => {
        const d = new Date(weekMonday)
        const offset = sl.diaSemana === 0 ? 6 : sl.diaSemana - 1
        d.setDate(d.getDate() + offset)
        const existingSlot = existing.slots[idx]
        return {
          id: existingSlot?.id ?? `slot-${idx}`,
          fecha: formatDate(d),
          horaInicio: sl.horaInicio,
          horaFin: sl.horaFin,
          tipo: sl.tipo ?? 'regular',
          equipoLocalId: existingSlot?.equipoLocalId,
          equipoVisitanteId: existingSlot?.equipoVisitanteId,
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

        const maxN = existing.slots.reduce((m, sl) => {
          const n = parseInt(sl.id.replace('slot-', '').replace('extra-', ''), 10)
          return isNaN(n) ? m : Math.max(m, n)
        }, 0)
        let idCounter = maxN + 1

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
              newSlots.push({ id: `slot-${idCounter}`, fecha, horaInicio: ts.horaInicio, horaFin: ts.horaFin, tipo: existing?.playoffMode ? 'amistoso' : 'regular' })
              idCounter++
            }
          }
        }

        slots = [...slotsWithHabilitados, ...newSlots, ...eliminatoriaSlots]
      }

      set((s) => ({ schedules: { ...s.schedules, [divisionId]: { divisionId, slots, plantilla: migratedPlantilla, refDate: formatDate(weekMonday), horarioSnapshot: horarioPartido, diasSnapshot: diasPartido, duracionSnapshot: duracionPartido, descansoSnapshot: descanso, descansoEquipoId: existing?.descansoEquipoId, playoffMode: existing?.playoffMode ?? false } }, hasUnsaved: false, programacionGuardada: { ...s.programacionGuardada, [divisionId]: false } }))
      return
    }

    const newSlots = generateSlots(diasPartido, horarioPartido, duracionPartido, descanso, refDate, maxSlots)
    if (existing) {
      for (let i = 0; i < newSlots.length && i < existing.slots.length; i++) {
        newSlots[i].equipoLocalId = existing.slots[i].equipoLocalId
        newSlots[i].equipoVisitanteId = existing.slots[i].equipoVisitanteId
        newSlots[i].tipo = existing.slots[i].tipo
      }
    } else if (existing?.playoffMode) {
      for (const sl of newSlots) {
        if (sl.tipo === 'regular') sl.tipo = 'amistoso'
      }
    }
    const slots = [...newSlots, ...eliminatoriaSlots]
    const firstFecha = newSlots.length > 0 ? newSlots[0].fecha : undefined
    const refDateForStore = firstFecha && isValidDateStr(firstFecha) ? formatDate(getMondayOfThisWeek(localDateFromString(firstFecha))) : undefined
    set((s) => ({ schedules: { ...s.schedules, [divisionId]: { divisionId, slots, plantilla: undefined, refDate: refDateForStore, horarioSnapshot: horarioPartido, diasSnapshot: diasPartido, duracionSnapshot: duracionPartido, descansoSnapshot: descanso, descansoEquipoId: existing?.descansoEquipoId, playoffMode: existing?.playoffMode ?? false } }, hasUnsaved: false, programacionGuardada: { ...s.programacionGuardada, [divisionId]: false } }))
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
      const slots = schedule.slots.map((sl) => ({ ...sl, canchaId }))
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
      const slots = [...regulars.slice(0, keepRegular), ...other, ...normalized]
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
  },

  replaceSlots: (divisionId, newSlots) => {
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      const normalized = newSlots.map((sl) =>
        sl.tipo === 'eliminatoria' && sl.partidoId ? { ...sl, id: `elim-${sl.partidoId}` } : sl
      )
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
      const deduped = [...dedupedOthers, ...dedupedElim]
      if (deduped.length === schedule.slots.length && deduped.every((d, i) => {
        const o = schedule.slots[i]
        return d.id === o.id && d.fecha === o.fecha && d.horaInicio === o.horaInicio && d.horaFin === o.horaFin && d.equipoLocalId === o.equipoLocalId && d.equipoVisitanteId === o.equipoVisitanteId && d.tipo === o.tipo && d.partidoId === o.partidoId && d.rondaNombre === o.rondaNombre
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
      const slots = schedule.slots.filter((sl) => sl.tipo !== 'eliminatoria')
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
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
        const slots = schedule.slots.map((sl) => {
          if (sl.tipo === 'regular' || sl.tipo === 'complemento') {
            return { ...sl, tipo: 'amistoso' as const }
          }
          return sl
        })
        return {
          schedules: { ...s.schedules, [divisionId]: { ...schedule, slots, playoffMode: true } },
          hasUnsaved: true,
          programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
        }
      }
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, playoffMode: active } },
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
    set((s) => {
      const schedule = s.schedules[divisionId]
      if (!schedule) return s
      if (schedule.playoffMode && (tipo === 'regular' || tipo === 'complemento')) return s
      const maxN = schedule.slots.reduce((m, sl) => {
        const n = parseInt(sl.id.replace('slot-', '').replace('extra-', ''), 10)
        return isNaN(n) ? m : Math.max(m, n)
      }, 0)

      // Infer missing snapshots from existing slots
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
      if (validDays.length === 0 || !horarioStr || !duracion) {
        // Fallback: copy from last slot or defaults
        const ref = schedule.slots[schedule.slots.length - 1]
        const todayLocal = new Date()
        const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, "0")}-${String(todayLocal.getDate()).padStart(2, "0")}`
        return {
          schedules: { ...s.schedules, [divisionId]: { ...schedule, slots: [...schedule.slots, { id: `extra-${maxN + 1}`, fecha: ref?.fecha ?? todayStr, horaInicio: ref?.horaInicio ?? '18:00', horaFin: ref?.horaFin ?? '19:00', tipo: schedule.playoffMode && (tipo === 'regular' || tipo === 'complemento') ? 'amistoso' : tipo }], plantilla: undefined } },
          hasUnsaved: true,
          programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
        }
      }

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

      // Build occupied set per date (check overlap, not just same start)
      const occupied = new Map<string, Set<string>>()
      for (const sl of schedule.slots) {
        if (!occupied.has(sl.fecha)) occupied.set(sl.fecha, new Set())
        occupied.get(sl.fecha)!.add(sl.horaInicio)
      }

      // Check overlap helper
      const overlapsExisting = (fecha: string, inicio: string, fin: string): boolean => {
        const nStart = timeToMinutes(inicio)
        const nEnd = timeToMinutes(fin)
        return schedule.slots.some((sl) => {
          if (sl.fecha !== fecha || !sl.horaInicio || !sl.horaFin) return false
          const sStart = timeToMinutes(sl.horaInicio)
          const sEnd = timeToMinutes(sl.horaFin)
          return nStart < sEnd && nEnd > sStart
        })
      }

      const lastSlot = schedule.slots[schedule.slots.length - 1]

      // Search for first free datetime across upcoming valid days
      const todayLocal = new Date()
      const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, "0")}-${String(todayLocal.getDate()).padStart(2, "0")}`
      let foundFecha = lastSlot?.fecha ?? todayStr
      let foundHoraInicio = lastSlot?.horaInicio ?? '18:00'
      let foundHoraFin = lastSlot?.horaFin ?? '19:00'
      const cursor = lastSlot?.fecha ? localDateFromString(lastSlot.fecha) : new Date()
      for (let days = 0; days < 60; days++) {
        const dayOfWeek = cursor.getDay()
        if (validDays.includes(dayOfWeek)) {
          const fecha = formatDate(cursor)
          const ocupados = occupied.get(fecha) ?? new Set()
          let freeFound = false
          for (const ts of dayTimeSlots) {
            if (!ocupados.has(ts.horaInicio) && !overlapsExisting(fecha, ts.horaInicio, ts.horaFin)) {
              foundFecha = fecha
              foundHoraInicio = ts.horaInicio
              foundHoraFin = ts.horaFin
              freeFound = true
              break
            }
          }
          if (freeFound) break
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      const newSlot: TimeSlotConfig = {
        id: `extra-${maxN + 1}`,
        fecha: foundFecha,
        horaInicio: foundHoraInicio,
        horaFin: foundHoraFin,
        tipo: schedule.playoffMode && (tipo === 'regular' || tipo === 'complemento') ? 'amistoso' : tipo,
      }
      return {
        schedules: { ...s.schedules, [divisionId]: { ...schedule, slots: [...schedule.slots, newSlot], plantilla: undefined } },
        hasUnsaved: true,
        programacionGuardada: { ...s.programacionGuardada, [divisionId]: false },
      }
    })
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
        if (sl.id === slotId || sl.fecha !== newFecha) return false
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
              })),
          },
        },
      }
    })
  },

  advanceSchedule: (divisionId, lastJornadaFechaInicio) => {
    const schedule = get().schedules[divisionId]
    if (!schedule || schedule.slots.length === 0) return

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
        if (sl.id === slotId || sl.fecha !== slot.fecha) return false
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
      partialize: (state) => ({ habilitados: state.habilitados, schedules: state.schedules, programacionGuardada: state.programacionGuardada }),
    },
  ),
)
