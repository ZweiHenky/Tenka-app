import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidDateStr,
  computeRefDateFromJornada,
  ensureUniqueSlotIds,
  generateSlots,
  migrateDivisionScheduleState,
  reconcilePlayoffSlots,
  resolveCanchaConflicts,
  sortValidDays,
  useDivisionScheduleStore,
  type DivisionSchedule,
} from '../divisionSchedule'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

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

describe('resolveCanchaConflicts', () => {
  const schedule: DivisionSchedule = {
    divisionId: 'div-conflicts',
    slots: [],
    refDate: '2026-07-20',
    diasSnapshot: 'L',
    horarioSnapshot: '18:00 - 23:00',
    duracionSnapshot: 60,
    descansoSnapshot: 0,
  }

  it('keeps conflicting slots visible without moving either one', () => {
    const slots = resolveCanchaConflicts([
      { id: 'elim-p1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'eliminatoria', partidoId: 'p1', canchaId: 'c1' },
      { id: 'extra-1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'amistoso', canchaId: 'c1' },
    ], schedule)

    expect(slots.find((slot) => slot.id === 'extra-1')?.horaInicio).toBe('18:00')
    expect(slots.find((slot) => slot.id === 'elim-p1')?.horaInicio).toBe('18:00')
  })

  it('keeps simultaneous matches on different courts', () => {
    const slots = resolveCanchaConflicts([
      { id: 'extra-1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'amistoso', canchaId: 'c1' },
      { id: 'elim-p1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'eliminatoria', partidoId: 'p1', canchaId: 'c2' },
    ], schedule)

    expect(slots.map((slot) => slot.horaInicio)).toEqual(['18:00', '18:00'])
  })

  it('creates five unique times for three friendlies and two eliminatorias without courts', () => {
    const slots = resolveCanchaConflicts([
      ...Array.from({ length: 3 }, (_, i) => ({ id: `extra-${i}`, fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'amistoso' as const })),
      ...Array.from({ length: 2 }, (_, i) => ({ id: `elim-p${i}`, fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'eliminatoria' as const, partidoId: `p${i}` })),
    ], schedule)

    expect(new Set(slots.map((slot) => `${slot.fecha}-${slot.horaInicio}`)).size).toBe(1)
  })

  it('keeps unresolved conflict when the configured week has no capacity', () => {
    const noCapacity = { ...schedule, horarioSnapshot: '18:00 - 19:00' }
    const slots = resolveCanchaConflicts([
      { id: 'extra-1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'amistoso', canchaId: 'c1' },
      { id: 'elim-p1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'eliminatoria', partidoId: 'p1', canchaId: 'c1' },
    ], noCapacity)

    expect(slots).toHaveLength(2)
    expect(slots.map((slot) => slot.horaInicio)).toEqual(['18:00', '18:00'])
  })
})

describe('ensureUniqueSlotIds', () => {
  it('repairs different slots that share an id and preserves canonical eliminatoria ids', () => {
    const repaired = ensureUniqueSlotIds([
      { id: 'slot-1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'amistoso' },
      { id: 'slot-1', fecha: '2026-07-20', horaInicio: '19:00', horaFin: '20:00', tipo: 'amistoso' },
      { id: 'elim-final', fecha: '2026-07-20', horaInicio: '20:00', horaFin: '21:00', tipo: 'amistoso' },
      { id: 'anything', fecha: '2026-07-20', horaInicio: '21:00', horaFin: '22:00', tipo: 'eliminatoria', partidoId: 'final' },
    ])

    expect(new Set(repaired.map((slot) => slot.id)).size).toBe(4)
    expect(repaired.find((slot) => slot.tipo === 'eliminatoria')?.id).toBe('elim-final')
    expect(repaired.find((slot) => slot.horaInicio === '20:00')?.id).toMatch(/^slot-repaired-/)
  })

  it('removes identical duplicate eliminatoria slots', () => {
    const repaired = ensureUniqueSlotIds([
      { id: 'elim-final', fecha: '2026-07-20', horaInicio: '20:00', horaFin: '21:00', tipo: 'eliminatoria', partidoId: 'final' },
      { id: 'duplicate', fecha: '2026-07-20', horaInicio: '20:00', horaFin: '21:00', tipo: 'eliminatoria', partidoId: 'final' },
    ])

    expect(repaired).toHaveLength(1)
    expect(repaired[0].id).toBe('elim-final')
  })
})

describe('reconcilePlayoffSlots', () => {
  const candidates = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map((horaInicio, index) => ({
    fecha: '2026-07-20',
    horaInicio,
    horaFin: `${String(19 + index).padStart(2, '0')}:00`,
  }))

  const threeAutoFriendlies = candidates.slice(0, 3).map((candidate, index) => ({
    ...candidate,
    id: `slot-${index}`,
    tipo: 'amistoso' as const,
  }))

  it('adds the fourth friendly when two semifinals become one final for ten teams', () => {
    const result = reconcilePlayoffSlots(
      threeAutoFriendlies,
      [{ id: 'final', rondaNombre: 'Final', llave: 1, equipoLocalId: 't1', equipoVisitanteId: 't2' }],
      4,
      candidates,
    )

    expect(result.filter((slot) => slot.tipo === 'amistoso')).toHaveLength(4)
    expect(result.filter((slot) => slot.tipo === 'eliminatoria')).toHaveLength(1)
    expect(result.find((slot) => slot.partidoId === 'final')?.horaInicio).toBe('21:00')
    expect(result.filter((slot) => slot.tipo === 'amistoso').at(-1)?.horaInicio).toBe('22:00')
    expect(new Set(result.map((slot) => slot.id)).size).toBe(5)
    expect(new Set(result.map((slot) => `${slot.fecha}-${slot.horaInicio}`)).size).toBe(5)
  })

  it('trims automatic friendlies when the schedule returns to two eliminatorias', () => {
    const fourAutoFriendlies = [...threeAutoFriendlies, { ...candidates[3]!, id: 'slot-3', tipo: 'amistoso' as const }]
    const result = reconcilePlayoffSlots(
      fourAutoFriendlies,
      [
        { id: 'semi-1', rondaNombre: 'Semifinal', llave: 1, equipoLocalId: 't1', equipoVisitanteId: 't2' },
        { id: 'semi-2', rondaNombre: 'Semifinal', llave: 2, equipoLocalId: 't3', equipoVisitanteId: 't4' },
      ],
      3,
      candidates,
    )

    expect(result.filter((slot) => slot.tipo === 'amistoso')).toHaveLength(3)
    expect(result.filter((slot) => slot.tipo === 'eliminatoria')).toHaveLength(2)
    expect(new Set(result.map((slot) => `${slot.fecha}-${slot.horaInicio}`)).size).toBe(5)
  })

  it('preserves manual friendlies outside the automatic target', () => {
    const manual = { ...candidates[5]!, fecha: '2026-07-21', id: 'extra-1', tipo: 'amistoso' as const }
    const result = reconcilePlayoffSlots(
      [...threeAutoFriendlies, manual],
      [{ id: 'final', rondaNombre: 'Final', llave: 1, equipoLocalId: 't1', equipoVisitanteId: 't2' }],
      4,
      candidates,
    )

    expect(result.filter((slot) => slot.tipo === 'amistoso' && slot.id.startsWith('slot-'))).toHaveLength(4)
    expect(result.find((slot) => slot.id === 'extra-1')).toEqual(manual)
  })

  it('repairs regular slots from a stale pre-normalization snapshot', () => {
    const result = reconcilePlayoffSlots(
      candidates.slice(0, 3).map((candidate, index) => ({ ...candidate, id: `slot-${index}`, tipo: 'regular' as const })),
      [],
      3,
      candidates,
    )

    expect(result.every((slot) => slot.tipo === 'amistoso')).toBe(true)
    expect(result.every((slot) => slot.prePlayoffTipo === 'regular')).toBe(true)
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

  it('multiplies each date/time capacity by active courts', () => {
    const slots = generateSlots('L', '18:00 - 20:00', 60, 0, '2026-07-20', 4, ['c1', 'c2'])
    expect(slots.map((item) => `${item.horaInicio}-${item.canchaId}`)).toEqual([
      '18:00-c1', '18:00-c2', '19:00-c1', '19:00-c2',
    ])
  })
})

describe('division schedule persistence migration', () => {
  it('retains valid court ids in drafts and templates and removes unsafe values', () => {
    const migrated = migrateDivisionScheduleState({
      schedules: {
        division: {
          divisionId: 'division',
          slots: [
            { id: 'one', fecha: '2026-08-03', horaInicio: '18:00', horaFin: '19:00', canchaId: 'court-a' },
            { id: 'two', fecha: '2026-08-03', horaInicio: '19:00', horaFin: '20:00', canchaId: 42 },
          ],
          plantilla: [{ diaSemana: 1, horaInicio: '18:00', horaFin: '19:00', canchaId: 'court-a' }],
        },
      },
    })

    const schedule = migrated.schedules?.division
    expect(schedule?.slots[0].canchaId).toBe('court-a')
    expect(schedule?.slots[1].canchaId).toBeUndefined()
    expect(schedule?.plantilla?.[0].canchaId).toBe('court-a')
  })

  it('repairs persisted regular slots when playoff mode is active', () => {
    const migrated = migrateDivisionScheduleState({
      schedules: {
        division: {
          divisionId: 'division',
          playoffMode: true,
          slots: [{ id: 'slot-1', fecha: '2026-08-03', horaInicio: '18:00', horaFin: '19:00', tipo: 'regular' }],
        },
      },
    })

    expect(migrated.schedules?.division.slots[0]).toMatchObject({ tipo: 'amistoso', prePlayoffTipo: 'regular' })
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

    it('stores and applies the authoritative fixed court', () => {
      useDivisionScheduleStore.getState().initSchedule(
        'div-fixed', 'L', '18:00 - 20:00', 60, 0, '2026-07-20', 2, [], ['court-1'], 'court-1',
      )

      const sched = useDivisionScheduleStore.getState().schedules['div-fixed']
      expect(sched.canchaUnicaIdSnapshot).toBe('court-1')
      expect(sched.slots.every((slot) => slot.canchaId === 'court-1')).toBe(true)
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

  describe('addSlot', () => {
    it('fills an earlier vacancy before creating a slot in a later day', () => {
      const store = useDivisionScheduleStore
      store.getState().initSchedule('div-add1', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 4)
      let sched = store.getState().schedules['div-add1']!
      store.getState().removeSlot('div-add1', sched.slots[1].id)
      const slot = store.getState().addSlot('div-add1', 'regular')
      expect(slot).not.toBeNull()
      expect(slot!.fecha).toBe('2026-07-20')
      expect(slot!.horaInicio).toBe('19:00')
    })

    it('fills earliest configured day when previous day is full', () => {
      const store = useDivisionScheduleStore
      store.getState().initSchedule('div-add2', 'L,M,Mi', '18:00 - 19:00', 60, 0, '2026-07-20', 3)
      let sched = store.getState().schedules['div-add2']!
      store.getState().removeSlot('div-add2', sched.slots[0].id)
      const slot = store.getState().addSlot('div-add2', 'regular')
      expect(slot).not.toBeNull()
      expect(slot!.fecha).toBe('2026-07-20')
    })

    it('is independent of array order (not starting from last element)', () => {
      const store = useDivisionScheduleStore
      store.getState().initSchedule('div-add3', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 4)
      let sched = store.getState().schedules['div-add3']!
      store.getState().removeSlot('div-add3', sched.slots[1].id)
      store.getState().removeSlot('div-add3', sched.slots[2].id)
      const slot = store.getState().addSlot('div-add3', 'regular')
      expect(slot).not.toBeNull()
      expect(slot!.fecha).toBe('2026-07-20')
      expect(slot!.horaInicio).toBe('19:00')
    })

    it('returns null when no free slot in the reference week', () => {
      const store = useDivisionScheduleStore
      store.getState().initSchedule('div-add4', 'L', '18:00 - 20:00', 60, 0, '2026-07-20', 2)
      expect(store.getState().addSlot('div-add4', 'regular')).toBeNull()
    })

    it('returns null for non-existent division', () => {
      const store = useDivisionScheduleStore
      expect(store.getState().addSlot('div-nonexistent', 'regular')).toBeNull()
    })

    it('preserves slot tipo (regular/amistoso/complemento)', () => {
      const store = useDivisionScheduleStore
      store.getState().initSchedule('div-add5', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 2)
      let sched = store.getState().schedules['div-add5']!
      store.getState().removeSlot('div-add5', sched.slots[1].id)

      expect(store.getState().addSlot('div-add5', 'regular')!.tipo).toBe('regular')
      store.getState().removeSlot('div-add5', store.getState().schedules['div-add5']!.slots[1].id)
      expect(store.getState().addSlot('div-add5', 'amistoso')!.tipo).toBe('amistoso')
      store.getState().removeSlot('div-add5', store.getState().schedules['div-add5']!.slots[1].id)
      expect(store.getState().addSlot('div-add5', 'complemento')!.tipo).toBe('complemento')
    })

    it('blocks regular/complemento in playoff mode', () => {
      const store = useDivisionScheduleStore
      store.getState().initSchedule('div-add6', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 2)
      store.getState().setPlayoffMode('div-add6', true)
      expect(store.getState().addSlot('div-add6', 'regular')).toBeNull()
      expect(store.getState().addSlot('div-add6', 'complemento')).toBeNull()
      let sched = store.getState().schedules['div-add6']!
      store.getState().removeSlot('div-add6', sched.slots[1].id)
      expect(store.getState().addSlot('div-add6', 'amistoso')).not.toBeNull()
    })

    it('restores five regular slots after deleting two eliminatorias', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-exit-playoff', 'L', '18:00 - 23:00', 60, 0, '2026-07-20', 5)
      store.setHabilitados('div-exit-playoff', Array.from({ length: 10 }, (_, i) => `t${i}`))
      const original = useDivisionScheduleStore.getState().schedules['div-exit-playoff']
      store.setScheduleTipoSlots('div-exit-playoff', [
        { ...original.slots[3], tipo: 'eliminatoria', partidoId: 'p1' },
        { ...original.slots[4], tipo: 'eliminatoria', partidoId: 'p2' },
      ])
      store.setPlayoffMode('div-exit-playoff', true)

      let playoff = useDivisionScheduleStore.getState().schedules['div-exit-playoff']
      expect(playoff.slots.filter((slot) => slot.tipo === 'amistoso')).toHaveLength(3)
      expect(playoff.slots.filter((slot) => slot.tipo === 'eliminatoria')).toHaveLength(2)

      store.clearEliminatoriaSlots('div-exit-playoff')
      store.setPlayoffMode('div-exit-playoff', false)

      const restored = useDivisionScheduleStore.getState().schedules['div-exit-playoff']
      expect(restored.playoffMode).toBe(false)
      expect(restored.slots.filter((slot) => (slot.tipo ?? 'regular') === 'regular')).toHaveLength(5)
      expect(restored.slots.some((slot) => slot.tipo === 'eliminatoria')).toBe(false)
      expect(new Set(restored.slots.map((slot) => `${slot.fecha}-${slot.horaInicio}`)).size).toBe(5)
    })

    it('preserves manual amistosos when leaving playoff mode', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-manual-friendly', 'L', '18:00 - 21:00', 60, 0, '2026-07-20', 2)
      const schedule = useDivisionScheduleStore.getState().schedules['div-manual-friendly']
      store.removeSlot('div-manual-friendly', schedule.slots[1].id)
      const manual = store.addSlot('div-manual-friendly', 'amistoso')!
      store.setPlayoffMode('div-manual-friendly', true)
      store.setPlayoffMode('div-manual-friendly', false)

      const restored = useDivisionScheduleStore.getState().schedules['div-manual-friendly']
      expect(restored.slots.find((slot) => slot.id === manual.id)?.tipo).toBe('amistoso')
    })

    it('restores complemento to its pre-playoff type', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-restore-complemento', 'L', '18:00 - 21:00', 60, 0, '2026-07-20', 2)
      const schedule = useDivisionScheduleStore.getState().schedules['div-restore-complemento']
      store.setSlotTipo('div-restore-complemento', schedule.slots[0].id, 'complemento')
      store.setPlayoffMode('div-restore-complemento', true)
      store.setPlayoffMode('div-restore-complemento', false)

      const restored = useDivisionScheduleStore.getState().schedules['div-restore-complemento']
      expect(restored.slots.find((slot) => slot.id === schedule.slots[0].id)?.tipo).toBe('complemento')
    })

    it('repairs stale regular slots even when playoff mode is already active', () => {
      useDivisionScheduleStore.setState({
        schedules: {
          stale: {
            divisionId: 'stale',
            playoffMode: true,
            slots: [{ id: 'slot-1', fecha: '2026-08-03', horaInicio: '18:00', horaFin: '19:00', tipo: 'regular' }],
          },
        },
      })

      useDivisionScheduleStore.getState().setPlayoffMode('stale', true)

      expect(useDivisionScheduleStore.getState().schedules.stale.slots[0]).toMatchObject({ tipo: 'amistoso', prePlayoffTipo: 'regular' })
    })

    it('does not let stale reconciliation restore regular slots after playoff activation', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('race', 'L', '18:00 - 23:00', 60, 0, '2026-07-20', 5)
      const original = useDivisionScheduleStore.getState().schedules.race
      store.setScheduleTipoSlots('race', [
        { ...original.slots[3], tipo: 'eliminatoria', partidoId: 'semi-1' },
        { ...original.slots[4], tipo: 'eliminatoria', partidoId: 'semi-2' },
      ])
      const staleSnapshot = useDivisionScheduleStore.getState().schedules.race.slots.map((slot) =>
        slot.tipo === 'amistoso' ? { ...slot, tipo: slot.prePlayoffTipo ?? 'regular' as const } : slot,
      )

      store.replaceSlots('race', staleSnapshot)

      const repaired = useDivisionScheduleStore.getState().schedules.race
      expect(repaired.slots.filter((slot) => slot.tipo === 'eliminatoria')).toHaveLength(2)
      expect(repaired.slots.filter((slot) => slot.tipo === 'amistoso')).toHaveLength(3)
      expect(repaired.slots.some((slot) => slot.tipo === 'regular' || slot.tipo === 'complemento')).toBe(false)
    })

    it('clearEliminatoriaSlots does not exit playoff mode by itself', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-stay-playoff', 'L', '18:00 - 21:00', 60, 0, '2026-07-20', 2)
      store.setPlayoffMode('div-stay-playoff', true)
      store.clearEliminatoriaSlots('div-stay-playoff')
      expect(useDivisionScheduleStore.getState().schedules['div-stay-playoff'].playoffMode).toBe(true)
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

    it('advances refDate even when no slots remain', () => {
      useDivisionScheduleStore.setState({
        schedules: {
          'div-empty-week': {
            divisionId: 'div-empty-week',
            slots: [],
            refDate: '2026-07-20',
            diasSnapshot: 'L',
            horarioSnapshot: '18:00 - 23:00',
            duracionSnapshot: 60,
            descansoSnapshot: 0,
          },
        },
      })

      useDivisionScheduleStore.getState().advanceSchedule('div-empty-week', '2026-07-20')
      expect(useDivisionScheduleStore.getState().schedules['div-empty-week'].refDate).toBe('2026-07-27')
    })

    it('regenerates unique friendly slots around a final in the next week', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-final-cycle', 'L', '18:00 - 23:00', 60, 0, '2026-07-20', 5)
      store.setHabilitados('div-final-cycle', Array.from({ length: 10 }, (_, i) => `t${i}`))
      const original = useDivisionScheduleStore.getState().schedules['div-final-cycle']
      store.setScheduleTipoSlots('div-final-cycle', [
        { ...original.slots[3], tipo: 'eliminatoria', partidoId: 'semi-1' },
        { ...original.slots[4], tipo: 'eliminatoria', partidoId: 'semi-2' },
      ])
      store.setPlayoffMode('div-final-cycle', true)

      store.guardarProgramacion('div-final-cycle')
      store.clearExtraSlots('div-final-cycle')
      store.clearEliminatoriaSlots('div-final-cycle')
      store.advanceSchedule('div-final-cycle', '2026-07-20')

      let next = useDivisionScheduleStore.getState().schedules['div-final-cycle']
      expect(next.slots).toHaveLength(0)
      expect(next.refDate).toBe('2026-07-27')
      expect(next.plantilla).toHaveLength(3)

      store.replaceSlots('div-final-cycle', [{
        id: 'elim-final',
        fecha: '2026-07-27',
        horaInicio: '18:00',
        horaFin: '19:00',
        tipo: 'eliminatoria',
        partidoId: 'final',
      }])
      store.initSchedule('div-final-cycle', 'L', '18:00 - 23:00', 60, 0, '2026-07-27', 4)

      next = useDivisionScheduleStore.getState().schedules['div-final-cycle']
      expect(next.refDate).toBe('2026-07-27')
      expect(next.slots.filter((slot) => slot.tipo === 'eliminatoria')).toHaveLength(1)
      expect(next.slots.filter((slot) => slot.tipo === 'amistoso')).toHaveLength(4)
      expect(new Set(next.slots.map((slot) => `${slot.fecha}-${slot.horaInicio}`)).size).toBe(4)
    })
  })

  describe('clearExtraSlots', () => {
    it('removes normalized friendlies and keeps eliminatoria slots in playoff mode', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-ext', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 5)
      const sched = useDivisionScheduleStore.getState().schedules['div-ext']!
      store.setSlotTipo('div-ext', sched.slots[0].id, 'amistoso')
      store.setSlotTipo('div-ext', sched.slots[1].id, 'complemento')
      // Add an eliminatoria-like slot
      store.setScheduleTipoSlots('div-ext', [{ ...sched.slots[3], tipo: 'eliminatoria', partidoId: 'p1' }])

      const before = useDivisionScheduleStore.getState().schedules['div-ext']!
      expect(before.slots.filter((s) => s.tipo === 'amistoso').length).toBe(3)
      expect(before.slots.filter((s) => s.tipo === 'complemento').length).toBe(0)
      expect(before.slots.filter((s) => s.tipo === 'eliminatoria').length).toBe(1)
      expect(before.slots.filter((s) => !s.tipo || s.tipo === 'regular').length).toBe(0)

      store.clearExtraSlots('div-ext')

      const after = useDivisionScheduleStore.getState().schedules['div-ext']!
      expect(after.slots.filter((s) => s.tipo === 'amistoso').length).toBe(0)
      expect(after.slots.filter((s) => s.tipo === 'complemento').length).toBe(0)
      expect(after.slots.filter((s) => s.tipo === 'eliminatoria').length).toBe(1)
      expect(after.slots.filter((s) => !s.tipo || s.tipo === 'regular').length).toBe(0)
    })

    it('does nothing when no extra slots exist', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-ext2', 'L,M', '18:00 - 20:00', 60, 0, '2026-07-20', 3)
      const before = useDivisionScheduleStore.getState().schedules['div-ext2']!
      const count = before.slots.length

      store.clearExtraSlots('div-ext2')

      const after = useDivisionScheduleStore.getState().schedules['div-ext2']!
      expect(after.slots.length).toBe(count)
    })

    it('does nothing for missing division', () => {
      useDivisionScheduleStore.getState().clearExtraSlots('non-existent')
    })
  })

  describe('cancha conflict normalization', () => {
    it('synchronizes the fixed-court snapshot and drops a stale template', () => {
      useDivisionScheduleStore.setState({
        schedules: {
          fixed: {
            divisionId: 'fixed',
            canchaUnicaIdSnapshot: 'old',
            slots: [{ id: 'slot-1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', canchaId: 'old' }],
            plantilla: [{ diaSemana: 1, horaInicio: '18:00', horaFin: '19:00', canchaId: 'old' }],
          },
        },
      })
      const nextSlots = [{ id: 'slot-1', fecha: '2026-07-20', horaInicio: '19:00', horaFin: '20:00', canchaId: 'new' }]

      useDivisionScheduleStore.getState().syncCanchaUnica('fixed', 'new', nextSlots)

      const schedule = useDivisionScheduleStore.getState().schedules.fixed
      expect(schedule.canchaUnicaIdSnapshot).toBe('new')
      expect(schedule.slots).toEqual(nextSlots)
      expect(schedule.plantilla).toBeUndefined()
    })

    it('does not move times when assigning the same court to all', () => {
      useDivisionScheduleStore.setState({
        schedules: {
          'div-court': {
            divisionId: 'div-court',
            refDate: '2026-07-20',
            diasSnapshot: 'L',
            horarioSnapshot: '18:00 - 20:00',
            duracionSnapshot: 60,
            descansoSnapshot: 0,
            slots: [
              { id: 'extra-1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'amistoso', canchaId: 'c1' },
              { id: 'elim-p1', fecha: '2026-07-20', horaInicio: '18:00', horaFin: '19:00', tipo: 'eliminatoria', partidoId: 'p1', canchaId: 'c2' },
            ],
          },
        },
      })

      useDivisionScheduleStore.getState().setAllSlotsCancha('div-court', 'c1')
      const slots = useDivisionScheduleStore.getState().schedules['div-court'].slots
      expect(new Set(slots.map((slot) => slot.horaInicio)).size).toBe(1)
      expect(slots.find((slot) => slot.tipo === 'amistoso')?.horaInicio).toBe('18:00')
      expect(slots.find((slot) => slot.tipo === 'eliminatoria')?.horaInicio).toBe('18:00')
    })

    it('eliminatorias reuse the times of the regular slots they replace', () => {
      const store = useDivisionScheduleStore.getState()
      store.initSchedule('div-replace', 'L', '18:00 - 23:00', 60, 0, '2026-07-20', 5)
      const before = useDivisionScheduleStore.getState().schedules['div-replace']
      const replacedTimes = before.slots.slice(3).map((slot) => slot.horaInicio)

      store.setScheduleTipoSlots('div-replace', [
        { id: 'elim-p1', fecha: '2026-07-20', horaInicio: '08:00', horaFin: '09:00', tipo: 'eliminatoria', partidoId: 'p1' },
        { id: 'elim-p2', fecha: '2026-07-20', horaInicio: '09:00', horaFin: '10:00', tipo: 'eliminatoria', partidoId: 'p2' },
      ])

      const after = useDivisionScheduleStore.getState().schedules['div-replace']
      expect(after.slots.filter((slot) => slot.tipo === 'eliminatoria').map((slot) => slot.horaInicio)).toEqual(replacedTimes)
      expect(new Set(after.slots.map((slot) => `${slot.fecha}-${slot.horaInicio}`)).size).toBe(5)
    })
  })
})
