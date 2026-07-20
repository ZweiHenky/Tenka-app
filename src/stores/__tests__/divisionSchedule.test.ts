import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

import {
  isValidDateStr,
  computeRefDateFromJornada,
  generateSlots,
  sortValidDays,
  useDivisionScheduleStore,
  type DivisionSchedule,
} from '../divisionSchedule'

// ---- Pure function tests ----

describe('isValidDateStr', () => {
  it('accepts valid YYYY-MM-DD', () => {
    expect(isValidDateStr('2026-07-13')).toBe(true)
  })

  it('rejects NaN-NaN-NaN', () => {
    expect(isValidDateStr('NaN-NaN-NaN')).toBe(false)
  })

  it('rejects ISO timestamp', () => {
    expect(isValidDateStr('2026-07-13T00:01:00.000Z')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidDateStr('')).toBe(false)
  })

  it('rejects February 30', () => {
    expect(isValidDateStr('2026-02-30')).toBe(false)
  })

  it('rejects garbage', () => {
    expect(isValidDateStr('not-a-date')).toBe(false)
  })
})

describe('computeRefDateFromJornada', () => {
  it('returns next Monday for a Monday plain date', () => {
    // 2026-07-13 is Monday → next Monday = 2026-07-20
    expect(computeRefDateFromJornada('2026-07-13')).toBe('2026-07-20')
  })

  it('handles ISO timestamp', () => {
    expect(computeRefDateFromJornada('2026-07-13T00:01:00.000Z')).toBe('2026-07-20')
  })

  it('returns same next Monday for Wednesday', () => {
    // 2026-07-15 is Wednesday → mon(Jul 15) = Jul 13 → +7 = Jul 20
    expect(computeRefDateFromJornada('2026-07-15')).toBe('2026-07-20')
  })

  it('returns same next Monday for Sunday', () => {
    // 2026-07-19 is Sunday → mon(Jul 19) = Jul 13 → +7 = Jul 20
    expect(computeRefDateFromJornada('2026-07-19')).toBe('2026-07-20')
  })

  it('returns undefined for empty string', () => {
    expect(computeRefDateFromJornada('')).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(computeRefDateFromJornada(null)).toBeUndefined()
  })

  it('returns undefined for garbage string', () => {
    expect(computeRefDateFromJornada('not-a-date')).toBeUndefined()
  })

  it('works across month boundary', () => {
    // 2026-07-31 Friday → mon(Jul 31) = Jul 27 → +7 = Aug 3
    expect(computeRefDateFromJornada('2026-07-31')).toBe('2026-08-03')
  })
})

describe('sortValidDays', () => {
  it('sorts Mon-Sun to 1-6,0', () => {
    expect(sortValidDays([0, 1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('keeps original order for Mon-Fri', () => {
    expect(sortValidDays([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts Sat-Mon', () => {
    expect(sortValidDays([6, 0, 1])).toEqual([1, 6, 0])
  })
})

describe('generateSlots', () => {
  it('fills a full day before moving to next day', () => {
    // L,M,Mi,J,V 18:00-20:00, duracion=60 descanso=0 → 2 slots/day
    // refDate = 2026-07-20 (Monday) → Mon 18:00, Mon 19:00, Tue 18:00
    const slots = generateSlots('L,M,Mi,J,V', '18:00 - 20:00', 60, 0, '2026-07-20', 3)
    expect(slots).toHaveLength(3)
    expect(slots[0].fecha).toBe('2026-07-20')
    expect(slots[0].horaInicio).toBe('18:00')
    expect(slots[1].fecha).toBe('2026-07-20')
    expect(slots[1].horaInicio).toBe('19:00')
    expect(slots[2].fecha).toBe('2026-07-21')
    expect(slots[2].horaInicio).toBe('18:00')
  })

  it('fills second slot of same day when needed', () => {
    // 4 slots with 2 slots/day → 2 on Monday, 2 on Tuesday
    const slots = generateSlots('L,M,Mi,J,V', '18:00 - 20:00', 60, 0, '2026-07-20', 4)
    expect(slots).toHaveLength(4)
    expect(slots[0].fecha).toBe('2026-07-20') // Mon 18:00
    expect(slots[1].fecha).toBe('2026-07-20') // Mon 19:00
    expect(slots[2].fecha).toBe('2026-07-21') // Tue 18:00
    expect(slots[3].fecha).toBe('2026-07-21') // Tue 19:00
  })

  it('respects descanso between slots', () => {
    // 18:00-19:00 with 30 min descanso → only one slot per day (18:00-19:00, next 19:30-20:30 out of range)
    const slots = generateSlots('L,M', '18:00 - 20:00', 60, 30, '2026-07-20', 4)
    expect(slots).toHaveLength(2)
    expect(slots[0].fecha).toBe('2026-07-20')
    expect(slots[0].horaInicio).toBe('18:00')
    expect(slots[1].fecha).toBe('2026-07-21')
    expect(slots[1].horaInicio).toBe('18:00')
  })

  it('returns empty array for empty horario', () => {
    expect(generateSlots('L,M', '', 60, 0, '2026-07-20', 3)).toEqual([])
  })

  it('returns empty array for empty dias', () => {
    expect(generateSlots('', '18:00 - 20:00', 60, 0, '2026-07-20', 3)).toEqual([])
  })

  it('handles undefined refDate by using next Monday from tomorrow', () => {
    // Can't assert exact dates or times without controlling system clock,
    // but assert structure and valid dates
    const slots = generateSlots('L,M,Mi,J,V', '18:00 - 20:00', 60, 0, undefined, 5)
    expect(slots).toHaveLength(5)
    for (const s of slots) {
      expect(isValidDateStr(s.fecha)).toBe(true)
      expect(s.tipo).toBe('regular')
    }
  })

  it('uses next Monday from tomorrow when refDate is invalid', () => {
    const slots = generateSlots('L,M,Mi,J,V', '18:00 - 20:00', 60, 0, 'NaN-NaN-NaN', 3)
    expect(slots).toHaveLength(3)
    for (const s of slots) {
      expect(isValidDateStr(s.fecha)).toBe(true)
    }
  })

  it('never produces NaN dates', () => {
    const slots = generateSlots('S,D', '10:00 - 12:00', 60, 0, undefined, 10)
    for (const s of slots) {
      expect(isValidDateStr(s.fecha)).toBe(true)
    }
  })

  it('handles multiple time ranges', () => {
    // 18:00-19:00 and 20:00-21:00, L,M → 2 slots/day = 4 slots
    const slots = generateSlots('L,M', '18:00 - 19:00 / 20:00 - 21:00', 60, 0, '2026-07-20', 4)
    expect(slots).toHaveLength(4)
    expect(slots[0].fecha).toBe('2026-07-20') // Mon 18:00
    expect(slots[1].fecha).toBe('2026-07-20') // Mon 20:00
    expect(slots[2].fecha).toBe('2026-07-21') // Tue 18:00
    expect(slots[3].fecha).toBe('2026-07-21') // Tue 20:00
  })

  it('maxSlots=0 returns empty', () => {
    expect(generateSlots('L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 0)).toEqual([])
  })

  it('slot ids are sequential', () => {
    const slots = generateSlots('L', '18:00 - 21:00', 60, 0, '2026-07-20', 3)
    expect(slots.map(s => s.id)).toEqual(['slot-0', 'slot-1', 'slot-2'])
  })

  it('slots have regular tipo by default', () => {
    const slots = generateSlots('L', '18:00 - 20:00', 60, 0, '2026-07-20', 1)
    expect(slots[0].tipo).toBe('regular')
  })
})

// ---- Store integration tests ----

describe('useDivisionScheduleStore', () => {
  beforeEach(() => {
    useDivisionScheduleStore.setState({
      schedules: {},
      habilitados: {},
      programacionGuardada: {},
      hasUnsaved: false,
    })
  })

  describe('initSchedule - fresh generation', () => {
    it('creates slots with valid dates', () => {
      useDivisionScheduleStore.getState().initSchedule(
        'div-1', 'L,M,Mi,J,V', '18:00 - 20:00', 60, 0, '2026-07-20', 3,
      )
      const sched = useDivisionScheduleStore.getState().schedules['div-1']
      expect(sched).toBeDefined()
      expect(sched!.slots).toHaveLength(3)
      for (const sl of sched!.slots) {
        expect(isValidDateStr(sl.fecha)).toBe(true)
      }
    })

    it('sets refDate based on first slot', () => {
      useDivisionScheduleStore.getState().initSchedule(
        'div-2', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 2,
      )
      const sched = useDivisionScheduleStore.getState().schedules['div-2']
      expect(sched!.refDate).toBe('2026-07-20')
    })
  })

  describe('initSchedule - reconstruction with plantilla', () => {
    it('reuses template when snapshots match', () => {
      // First call to create schedule
      useDivisionScheduleStore.getState().initSchedule(
        'div-3', 'L,M,Mi,J,V', '18:00 - 20:00', 60, 0, '2026-07-20', 3,
      )
      // Set teams on first two slots
      const s0 = useDivisionScheduleStore.getState().schedules['div-3']!.slots[0]
      useDivisionScheduleStore.getState().setSlotTeams('div-3', s0.id, 'team-a', 'team-b')
      const s1 = useDivisionScheduleStore.getState().schedules['div-3']!.slots[1]
      useDivisionScheduleStore.getState().setSlotTeams('div-3', s1.id, 'team-c', 'team-d')

      // Guardar to create plantilla
      useDivisionScheduleStore.getState().guardarProgramacion('div-3')

      // Second call with same settings → should reuse plantilla
      useDivisionScheduleStore.getState().initSchedule(
        'div-3', 'L,M,Mi,J,V', '18:00 - 20:00', 60, 0, '2026-07-27', 3,
      )
      const sched = useDivisionScheduleStore.getState().schedules['div-3']
      expect(sched!.slots).toHaveLength(3)
      // Should be shifted to week of Jul 27 (same relative days/hours)
      expect(sched!.slots[0].fecha).toBe('2026-07-27')
      expect(sched!.slots[0].horaInicio).toBe('18:00')
      expect(sched!.slots[1].fecha).toBe('2026-07-27')
      expect(sched!.slots[1].horaInicio).toBe('19:00')
      expect(sched!.slots[2].fecha).toBe('2026-07-28')
      expect(sched!.slots[2].horaInicio).toBe('18:00')
      // Teams should be preserved (filtering now happens in UI only)
      expect(sched!.slots[0].equipoLocalId).toBe('team-a')
      expect(sched!.slots[0].equipoVisitanteId).toBe('team-b')
      expect(sched!.slots[1].equipoLocalId).toBe('team-c')
      expect(sched!.slots[1].equipoVisitanteId).toBe('team-d')
    })
  })

  describe('initSchedule - repair corrupted NaN dates', () => {
    it('repairs schedule with NaN refDate', () => {
      const corrupted: DivisionSchedule = {
        divisionId: 'div-4',
        slots: [
          { id: 'slot-0', fecha: 'NaN-NaN-NaN', horaInicio: '18:00', horaFin: '19:00', tipo: 'regular' },
        ],
        refDate: 'NaN-NaN-NaN',
        horarioSnapshot: '18:00 - 20:00',
        diasSnapshot: 'L,M,Mi,J,V',
        duracionSnapshot: 60,
        descansoSnapshot: 0,
      }
      useDivisionScheduleStore.setState({
        schedules: { 'div-4': corrupted },
      })

      useDivisionScheduleStore.getState().initSchedule(
        'div-4', 'L,M,Mi,J,V', '18:00 - 20:00', 60, 0, undefined, 3,
      )
      const sched = useDivisionScheduleStore.getState().schedules['div-4']
      expect(sched).toBeDefined()
      expect(sched!.refDate).toBeDefined()
      expect(isValidDateStr(sched!.refDate!)).toBe(true)
      expect(sched!.slots.length).toBeGreaterThanOrEqual(3)
      for (const sl of sched!.slots) {
        expect(isValidDateStr(sl.fecha)).toBe(true)
      }
    })

    it('preserves eliminatoria slots during repair', () => {
      const corrupted: DivisionSchedule = {
        divisionId: 'div-5',
        slots: [
          { id: 'slot-0', fecha: 'NaN-NaN-NaN', horaInicio: '18:00', horaFin: '19:00', tipo: 'regular' },
          { id: 'elim-abc', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'eliminatoria', partidoId: 'abc' },
        ],
        refDate: 'NaN-NaN-NaN',
        horarioSnapshot: '18:00 - 20:00',
        diasSnapshot: 'L,M,Mi,J,V',
        duracionSnapshot: 60,
        descansoSnapshot: 0,
      }
      useDivisionScheduleStore.setState({
        schedules: { 'div-5': corrupted },
      })

      useDivisionScheduleStore.getState().initSchedule(
        'div-5', 'L,M,Mi,J,V', '18:00 - 20:00', 60, 0, undefined, 2,
      )
      const sched = useDivisionScheduleStore.getState().schedules['div-5']
      const eliminatoria = sched!.slots.filter(s => s.tipo === 'eliminatoria')
      expect(eliminatoria).toHaveLength(1)
      expect(eliminatoria[0].id).toBe('elim-abc')
    })
  })

  describe('advanceSchedule', () => {
    it('advances all slot fechas by one week while preserving teams and hours', () => {
      useDivisionScheduleStore.getState().initSchedule(
        'div-6', 'L,M,Mi,J,V', '18:00 - 20:00', 60, 0, '2026-07-20', 3,
      )
      // Set teams
      const sched = useDivisionScheduleStore.getState().schedules['div-6']!
      useDivisionScheduleStore.getState().setSlotTeams('div-6', sched.slots[0].id, 'team-a', 'team-b')
      useDivisionScheduleStore.getState().setSlotTeams('div-6', sched.slots[1].id, 'team-c', 'team-d')
      useDivisionScheduleStore.getState().setDescansoEquipoId('div-6', 'team-e')

      // Advance to next week (last jornada started 2026-07-20)
      useDivisionScheduleStore.getState().advanceSchedule('div-6', '2026-07-20')

      const advanced = useDivisionScheduleStore.getState().schedules['div-6']!
      // Date should be next Monday
      expect(advanced.refDate).toBe('2026-07-27')
      // All slots should be on next week's dates
      expect(advanced.slots[0].fecha).toBe('2026-07-27')
      expect(advanced.slots[1].fecha).toBe('2026-07-27')
      expect(advanced.slots[2].fecha).toBe('2026-07-28')
      // Teams preserved
      expect(advanced.slots[0].equipoLocalId).toBe('team-a')
      expect(advanced.slots[0].equipoVisitanteId).toBe('team-b')
      expect(advanced.slots[1].equipoLocalId).toBe('team-c')
      expect(advanced.slots[1].equipoVisitanteId).toBe('team-d')
      // Hours preserved
      expect(advanced.slots[0].horaInicio).toBe('18:00')
      expect(advanced.slots[0].horaFin).toBe('19:00')
      expect(advanced.slots[1].horaInicio).toBe('19:00')
      expect(advanced.slots[1].horaFin).toBe('20:00')
      // Descanso cleared
      expect(advanced.descansoEquipoId).toBeUndefined()
    })

    it('does nothing for schedule with no slots', () => {
      useDivisionScheduleStore.setState({
        schedules: { 'div-7': { divisionId: 'div-7', slots: [] } },
      })
      useDivisionScheduleStore.getState().advanceSchedule('div-7')
      const s = useDivisionScheduleStore.getState().schedules['div-7']
      expect(s?.slots).toEqual([])
    })

    it('sets hasUnsaved to false and programacionGuardada to false', () => {
      useDivisionScheduleStore.getState().initSchedule(
        'div-8', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 2,
      )
      useDivisionScheduleStore.getState().guardarProgramacion('div-8')
      // Advance after save
      useDivisionScheduleStore.getState().advanceSchedule('div-8', '2026-07-20')
      expect(useDivisionScheduleStore.getState().hasUnsaved).toBe(false)
      expect(useDivisionScheduleStore.getState().programacionGuardada['div-8']).toBe(false)
    })
  })
})
