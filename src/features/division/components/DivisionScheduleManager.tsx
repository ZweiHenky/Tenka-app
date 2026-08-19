import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { divisionApi } from "@/features/division/api/divisions"
import { useDivisionEquipos } from "@/features/division-equipo/hooks/useDivisionEquipo"
import TimeSlotCard from "@/features/division/components/TimeSlotCard"
import TeamPickerModal from "@/features/division/components/TeamPickerModal"
import TimePickerModal from "@/features/division/components/TimePickerModal"
import ErrorState from "@/shared/components/ErrorState"
import PullToRefresh from "@/shared/components/PullToRefresh"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { useDivisionScheduleStore, computeRefDateFromJornada, ensureUniqueSlotIds, generateSlots, getActiveSlots, isSlotManual, localDateFromString, reconcilePlayoffSlots, SLOT_DISTRIBUTION_VERSION, type CourtScheduleConfig, type PlayoffSlotCandidate, type TimeSlotConfig } from "@/stores/divisionSchedule"
import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"
import { useRondasPlayoff } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import { useToast } from "@/shared/components/Toast"
import { useCourtAvailability } from "@/features/court-availability/hooks/useCourtAvailability"
import { applyAutomaticCourtAssignments, isCourtOccupiedForSlot, planFromAvailability } from "@/features/court-availability/planner"
import { generateTimeSlots, isTimeSlotWithinRanges, type GeneratedTimeSlot } from "@/shared/utils/time-range"
import { availableTimesForDay, placementForDay, type DayPlacement } from "@/features/division/utils/slot-day-move"
import { timeForCourt } from "@/features/division/utils/slot-court-move"
import { resolveCourtSchedules, scheduleForCourt, unionOfPlayDays } from "@/features/division/utils/division-schedule"
import { inheritedPlayoffCandidates, isSchedulablePlayoffMatch } from "@/features/division/utils/playoff-slot-inheritance"

const DIA_NOMBRES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DIA_NOMBRES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const UNASSIGNED_COURT = "__UNASSIGNED__"

function formatFechaFull(fecha: string): string {
  const [y, m, d] = fecha.split("-")
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (isNaN(date.getTime())) return fecha
  return `${DIA_NOMBRES_FULL[date.getDay()]} ${d}/${m}/${y}`
}

function getDayOfWeek(fecha: string): number {
  const [y, m, d] = fecha.split("-")
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (isNaN(date.getTime())) return 1
  return date.getDay()
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

function getSlotInterval(slot: TimeSlotConfig): { start: number; end: number } | null {
  if (!slot.fecha || !slot.horaInicio || !slot.horaFin) return null
  const start = localDateFromString(slot.fecha)
  const end = localDateFromString(slot.fecha)
  const [startHour, startMinute] = slot.horaInicio.split(":").map(Number)
  const [endHour, endMinute] = slot.horaFin.split(":").map(Number)
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null
  start.setHours(startHour, startMinute, 0, 0)
  end.setHours(endHour, endMinute, 0, 0)
  if (end <= start) end.setDate(end.getDate() + 1)
  return { start: start.getTime(), end: end.getTime() }
}

interface Props {
  divisionId: string
  embedded?: boolean
  isFocused?: boolean
  isGeneratingJornada: boolean
  onGenerateJornada: () => void
  scrollRef?: { current: any }
  scrollOffsetRef?: { current: number }
}

export default function DivisionScheduleManager({ divisionId, embedded, isFocused = true, isGeneratingJornada, onGenerateJornada, scrollRef, scrollOffsetRef }: Props) {
  const toast = useToast()
  const qc = useQueryClient()
  const internalScrollRef = useRef<any>(null)
  const internalScrollOffsetRef = useRef(0)
  const activeScrollRef = scrollRef ?? internalScrollRef
  const activeScrollOffsetRef = scrollOffsetRef ?? internalScrollOffsetRef

  const { data: division, isLoading, error: divError, refetch: refetchDiv } = useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId!),
    enabled: isFocused && !!divisionId,
  })

  const { data: links = [] } = useDivisionEquipos(divisionId!, isFocused)
  const divisionTeams = useMemo(() => links.map((link) => link.equipo), [links])
  const schedule = useDivisionScheduleStore((s) => (divisionId ? s.schedules[divisionId] : undefined))
  const initSchedule = useDivisionScheduleStore((s) => s.initSchedule)
  const setSlotTeams = useDivisionScheduleStore((s) => s.setSlotTeams)
  const setSlotCancha = useDivisionScheduleStore((s) => s.setSlotCancha)
  const clearSlot = useDivisionScheduleStore((s) => s.clearSlot)
  const addSlot = useDivisionScheduleStore((s) => s.addSlot)
  const removeSlot = useDivisionScheduleStore((s) => s.removeSlot)
  const replaceSlots = useDivisionScheduleStore((s) => s.replaceSlots)
  const syncCanchaUnica = useDivisionScheduleStore((s) => s.syncCanchaUnica)
  const moveSlotToTime = useDivisionScheduleStore((s) => s.moveSlotToTime)
  const setDescansoEquipoId = useDivisionScheduleStore((s) => s.setDescansoEquipoId)
  const setPlayoffMode = useDivisionScheduleStore((s) => s.setPlayoffMode)
  const clearEliminatoriaSlots = useDivisionScheduleStore((s) => s.clearEliminatoriaSlots)
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const advanceSchedule = useDivisionScheduleStore((s) => s.advanceSchedule)

  const ligaId = division?.ligaId

  const [pickingSlot, setPickingSlot] = useState<{ slotId: string; side: "local" | "visitante" } | null>(null)
  const [timePickerSlot, setTimePickerSlot] = useState<TimeSlotConfig | null>(null)
  const [dayPickerSlot, setDayPickerSlot] = useState<TimeSlotConfig | null>(null)
  const [pendingCourtMove, setPendingCourtMove] = useState<
    { slot: TimeSlotConfig; fecha: string; placement: DayPlacement; courtName: string } | null
  >(null)
  const [showDescansoPicker, setShowDescansoPicker] = useState(false)
  const [canchaPickerSlotId, setCanchaPickerSlotId] = useState<string | null>(null)
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string | null>(null)
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const autoOpenedRef = useRef(false)
  const slotCardRefs = useRef<Record<string, any>>({})
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const disarmDelete = useCallback(() => setPendingDeleteSlotId(null), [])

  const { data: rondas = [], isSuccess: rondasLoaded } = useRondasPlayoff(divisionId!, isFocused)
  const playoffMode = rondas.length > 0

  useEffect(() => {
    if (!divisionId || !rondasLoaded) return
    if (playoffMode) {
      setPlayoffMode(divisionId, true)
    } else {
      clearEliminatoriaSlots(divisionId)
      setPlayoffMode(divisionId, false)
    }
  }, [divisionId, playoffMode, rondasLoaded, clearEliminatoriaSlots, setPlayoffMode])

  const slots = useMemo(() => schedule?.slots ?? [], [schedule])
  useEffect(() => {
    if (!divisionId || slots.length === 0) return
    const repaired = ensureUniqueSlotIds(slots)
    const changed = repaired.length !== slots.length || repaired.some((slot, index) => slot.id !== slots[index]?.id)
    if (changed) replaceSlots(divisionId, repaired)
  }, [divisionId, slots, replaceSlots])
  // Union across courts: the day tabs must show every day the division plays somewhere.
  // Deliberately independent of the court list — availabilityRange depends on weekDates, which
  // depends on this, so pulling canchas in here would create a cycle. Whether a given court
  // accepts a day is decided per placement anyway.
  const validDays = useMemo(() => unionOfPlayDays(division), [division])

  const weekDates = useMemo(() => {
    if (!schedule?.refDate || validDays.length === 0) return []
    const [y, m, d] = schedule.refDate.split("-").map(Number)
    const weekMonday = new Date(y, m - 1, d)
    if (isNaN(weekMonday.getTime())) return []
    const sorted = [...validDays].sort((a, b) => {
      const na = a === 0 ? 7 : a
      const nb = b === 0 ? 7 : b
      return na - nb
    })
    const seen = new Set<string>()
    return sorted.map((day) => {
      const date = new Date(weekMonday)
      const offset = day === 0 ? 6 : day - 1
      date.setDate(date.getDate() + offset)
      const fechaStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      if (seen.has(fechaStr)) return null
      seen.add(fechaStr)
      return fechaStr
    }).filter(Boolean) as string[]
  }, [schedule, validDays])

  const { data: lastJornada, isSuccess: lastJornadaLoaded } = useQuery({
    queryKey: ["last-jornada", divisionId],
    queryFn: async () => {
      const result = await jornadaApi.listByDivisionPaginated(divisionId!, 1, 1)
      return result.rows?.[0] ?? null
    },
    enabled: isFocused && !!divisionId,
  })

  const availabilityRange = useMemo(() => {
    const dates = slots.map((slot) => slot.fecha).filter(Boolean).sort()
    let first = dates[0] ?? weekDates[0] ?? schedule?.refDate ?? (lastJornada?.fechaInicio ? computeRefDateFromJornada(lastJornada.fechaInicio) : undefined)
    if (!first) {
      const next = new Date()
      next.setHours(0, 0, 0, 0)
      const daysUntilMonday = next.getDay() === 0 ? 1 : 8 - next.getDay()
      next.setDate(next.getDate() + daysUntilMonday)
      first = formatDateObj(next)
    }
    let last = dates.at(-1) ?? weekDates.at(-1)
    if (!last) {
      const end = localDateFromString(first)
      end.setDate(end.getDate() + 7)
      last = formatDateObj(end)
    }
    return {
      inicio: new Date(`${first}T00:00:00`).toISOString(),
      fin: new Date(`${last}T23:59:59.999`).toISOString(),
    }
  }, [lastJornada?.fechaInicio, schedule?.refDate, slots, weekDates])
  const availabilityQuery = useCourtAvailability(ligaId, availabilityRange?.inicio, availabilityRange?.fin, isFocused)
  const availability = availabilityQuery.data
  const canchas = useMemo(() => availability?.canchas ?? [], [availability?.canchas])
  const courtIds = useMemo(() => canchas.map((court) => court.id), [canchas])

  const horarioFor = useCallback(
    (canchaId?: string) => scheduleForCourt(division, canchas, canchaId).horarioPartido,
    [division, canchas],
  )

  // Feeds the per-court day check: a court must not receive a slot on a day it does not play.
  const diasFor = useCallback(
    (canchaId?: string) => scheduleForCourt(division, canchas, canchaId).diasPartido,
    [division, canchas],
  )


  // Each court can have its own days and ranges; these three derive everything else.
  const courtSchedules = useMemo(() => {
    const resolved = resolveCourtSchedules(division, canchas)
    const map = new Map<string, CourtScheduleConfig>()
    for (const [canchaId, schedule] of resolved) {
      if (canchaId) map.set(canchaId, schedule)
    }
    return map
  }, [division, canchas])


  const activeSlots = useMemo(() => getActiveSlots(slots, habilitados?.length ?? 0, playoffMode, courtIds), [slots, habilitados, playoffMode, courtIds])
  const hasComplementoSlot = useMemo(() => activeSlots.some((s) => s.tipo === 'complemento'), [activeSlots])
  const regularSlotsCount = useMemo(() => activeSlots.filter((s) => (s.tipo ?? 'regular') === 'regular').length, [activeSlots])
  const maxRegularSlots = useMemo(() => Math.floor((habilitados ?? []).length / 2), [habilitados])
  const atRegularLimit = useMemo(() => regularSlotsCount >= maxRegularSlots, [regularSlotsCount, maxRegularSlots])
  const visibleSlots = useMemo(() => {
    if (habilitados === undefined) return activeSlots
    const habSet = new Set(habilitados)
    return activeSlots.map((s) => ({
      ...s,
      equipoLocalId: s.equipoLocalId && habSet.has(s.equipoLocalId) ? s.equipoLocalId : undefined,
      equipoVisitanteId: s.equipoVisitanteId && habSet.has(s.equipoVisitanteId) ? s.equipoVisitanteId : undefined,
    }))
  }, [activeSlots, habilitados])

  const partidosEliminatoria = useMemo(() => rondas.flatMap((ronda) =>
    ronda.partidos.map((partido) => ({
      id: partido.id,
      rondaNombre: ronda.nombre,
      rondaOrden: ronda.orden,
      llave: partido.llave ?? 0,
      equipoLocalId: partido.equipoLocalId,
      equipoVisitanteId: partido.equipoVisitanteId,
      estado: partido.estado,
      jornadaId: partido.jornadaId,
    })),
  ), [rondas])

  useEffect(() => {
    if (!divisionId || !playoffMode || partidosEliminatoria.length === 0) return

    const uniquePartidos = partidosEliminatoria.filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    ).sort((left, right) => left.rondaOrden - right.rondaOrden || left.llave - right.llave)

    const pending = uniquePartidos.filter(isSchedulablePlayoffMatch)
    const schedulableIds = new Set(pending.map((partido) => partido.id))
    let slotsToKeep = slots.filter((s) => {
      if (s.tipo !== 'eliminatoria') return true
      return !!s.partidoId && schedulableIds.has(s.partidoId)
    })

    // Remove eliminatoria slots without partidoId (stale) and deduplicate by partidoId
    const seenPartidoId = new Set<string>()
    slotsToKeep = slotsToKeep.filter((s) => {
      if (s.tipo !== 'eliminatoria') return true
      if (!s.partidoId) return false
      if (seenPartidoId.has(s.partidoId)) return false
      seenPartidoId.add(s.partidoId)
      return true
    })

    const existingIds = new Set(slotsToKeep.filter((s) => s.tipo === 'eliminatoria' && s.partidoId).map((s) => s.partidoId))
    const nuevos = pending.filter((p) => !existingIds.has(p.id))

    // Update existing eliminatoria slots with latest server team data
    const pendingMap = new Map(pending.map((p) => [p.id, p]))
    slotsToKeep = slotsToKeep.map((s) => {
      if (s.tipo !== 'eliminatoria' || !s.partidoId) return s
      const match = pendingMap.get(s.partidoId)
      if (!match) return s
      return { ...s, equipoLocalId: match.equipoLocalId ?? undefined, equipoVisitanteId: match.equipoVisitanteId ?? undefined }
    })

    // Detect if team data changed (not just new slots added)
    let teamDataChanged = false
    if (nuevos.length === 0 && slotsToKeep.length === slots.length) {
      for (const s of slots) {
        if (s.tipo !== 'eliminatoria') continue
        const match = pendingMap.get(s.partidoId ?? '')
        if (!match) continue
        if (s.equipoLocalId !== (match.equipoLocalId ?? undefined) ||
            s.equipoVisitanteId !== (match.equipoVisitanteId ?? undefined)) {
          teamDataChanged = true
          break
        }
      }
    }
    // Detect if any eliminatoria slot has a non-canonical ID or is stale (no partidoId)
    const needsNormalization = slots.some(
      (s) => s.tipo === 'eliminatoria' && (s.id !== `elim-${s.partidoId}` || !s.partidoId)
    )

    // Keep the automatic playoff slots at the exact weekly capacity.
    const totalEliminatorias = slotsToKeep.filter((s) => s.tipo === 'eliminatoria').length + nuevos.length
    const baseRegular = Math.floor((habilitados ?? []).length / 2)
    const targetSlotCount = Math.max(0, baseRegular - totalEliminatorias)
    const autoAmistosoCount = slotsToKeep.filter((s) => s.tipo === 'amistoso' && !isSlotManual(s)).length
    const needsSlotCountNormalization = autoAmistosoCount !== targetSlotCount
    if (!teamDataChanged && nuevos.length === 0 && slotsToKeep.length === slots.length && !needsNormalization && !needsSlotCountNormalization) return

    const validDays = parseDiasPartido(division?.diasPartido ?? "sab")
    const refDate = schedule?.refDate ?? slots[0]?.fecha ?? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` })()

    const duracion = division?.duracionPartido ?? 60
    const dayTimeSlots = generateTimeSlots(division?.horarioPartido ?? "08:00-20:00", duracion, division?.descanso ?? 0)

    const defaultCandidates: PlayoffSlotCandidate[] = []
    const cursor = localDateFromString(refDate)
    for (let d = 0; d < 60; d++) {
      if (validDays.includes(cursor.getDay())) {
        const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
        for (const ts of dayTimeSlots) {
          defaultCandidates.push({ fecha, horaInicio: ts.horaInicio, horaFin: ts.horaFin })
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const inheritedCandidates = [...new Set(nuevos.map((partido) => partido.rondaOrden))].flatMap((roundOrder) => {
      const matchCount = nuevos.filter((partido) => partido.rondaOrden === roundOrder).length
      return inheritedPlayoffCandidates(rondas, roundOrder, refDate)
        .filter((candidate) => validDays.includes(localDateFromString(candidate.fecha).getDay())
          && isTimeSlotWithinRanges(division?.horarioPartido ?? "08:00-20:00", candidate.horaInicio, candidate.horaFin))
        .slice(0, matchCount)
    })
    const seenCandidates = new Set<string>()
    const candidates = [...inheritedCandidates, ...defaultCandidates].filter((candidate) => {
      const key = `${candidate.fecha}|${candidate.horaInicio}`
      if (seenCandidates.has(key)) return false
      seenCandidates.add(key)
      return true
    })

    // Remove eliminatoria participants from regular/special slots
    const finalSlots = reconcilePlayoffSlots(slotsToKeep, nuevos, targetSlotCount, candidates)
    const elimTeamIds = new Set<string>()
    for (const p of nuevos) {
      if (p.equipoLocalId) elimTeamIds.add(p.equipoLocalId)
      if (p.equipoVisitanteId) elimTeamIds.add(p.equipoVisitanteId)
    }
    for (const s of slotsToKeep) {
      if (s.tipo !== 'eliminatoria') continue
      if (s.equipoLocalId) elimTeamIds.add(s.equipoLocalId)
      if (s.equipoVisitanteId) elimTeamIds.add(s.equipoVisitanteId)
    }
    const cleanedSlots = finalSlots.map((s) => {
      if (s.tipo === 'eliminatoria') return s
      let { equipoLocalId, equipoVisitanteId } = s
      if (equipoLocalId && elimTeamIds.has(equipoLocalId)) equipoLocalId = undefined
      if (equipoVisitanteId && elimTeamIds.has(equipoVisitanteId)) equipoVisitanteId = undefined
      return { ...s, equipoLocalId, equipoVisitanteId }
    })

    if (JSON.stringify(cleanedSlots) !== JSON.stringify(slots)) {
      replaceSlots(divisionId!, cleanedSlots)
      if (schedule?.descansoEquipoId && elimTeamIds.has(schedule.descansoEquipoId)) {
        setDescansoEquipoId(divisionId!, undefined)
      }
    }
  }, [partidosEliminatoria, divisionId, division?.horarioPartido, division?.duracionPartido, division?.descanso, division?.diasPartido, habilitados, rondas, slots, replaceSlots, schedule?.descansoEquipoId, schedule?.refDate, setDescansoEquipoId, playoffMode])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["division", divisionId] }),
        qc.invalidateQueries({ queryKey: ["division-equipos", divisionId] }),
        qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] }),
        qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] }),
        qc.invalidateQueries({ queryKey: ["court-availability", ligaId] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, divisionId, ligaId])

  // Sync schedule if refDate is out of sync with last jornada
  useEffect(() => {
    if (!lastJornadaLoaded) return
    const expectedRefDate = lastJornada?.fechaInicio
      ? computeRefDateFromJornada(lastJornada.fechaInicio)
      : computeRefDateFromJornada(new Date().toISOString())
    if (!expectedRefDate) return
    if (schedule?.refDate && schedule.refDate !== expectedRefDate) {
      advanceSchedule(divisionId!, lastJornada?.fechaInicio)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastJornadaLoaded, lastJornada?.fechaInicio, schedule?.refDate])

  const assignedTeams = useMemo(
    () => {
      const habSet = new Set(habilitados ?? [])
      const blockedTeamIds = new Set<string>()
      for (const sl of activeSlots) {
        if (sl.tipo === 'amistoso') continue
        if (sl.tipo === 'complemento' && sl.equipoVisitanteId && !sl.equipoLocalId) continue
        if (sl.equipoLocalId) blockedTeamIds.add(sl.equipoLocalId)
        if (sl.tipo !== 'complemento' && sl.equipoVisitanteId) blockedTeamIds.add(sl.equipoVisitanteId)
        if (sl.tipo === 'complemento' && sl.equipoLocalId) blockedTeamIds.add(sl.equipoLocalId)
      }
      return divisionTeams.filter((t) => habSet.has(t.id) && !blockedTeamIds.has(t.id))
    },
    [divisionTeams, habilitados, activeSlots],
  )

  const pickerTeams = useMemo(() => {
    if (!pickingSlot) return assignedTeams
    const currentSlot = slots.find((s) => s.id === pickingSlot.slotId)
    if (!currentSlot) return assignedTeams
    const tipo = currentSlot.tipo ?? 'regular'
    const isComplementoSinPuntos = tipo === 'complemento' && pickingSlot.side === 'visitante'
    const isAmistoso = tipo === 'amistoso'
    if (isComplementoSinPuntos || isAmistoso) {
      const habSet = new Set(habilitados ?? [])
      return divisionTeams.filter((t) => habSet.has(t.id))
    }
    return assignedTeams
  }, [pickingSlot, slots, assignedTeams, divisionTeams, habilitados])

  const multipleCourts = availability?.mode === "MULTIPLE"
  const canchaUnicaId = division?.canchaUnicaId ?? null
  const canchaUnica = canchas.find((cancha) => cancha.id === canchaUnicaId)
  const canchaUnicaInactiva = !!canchaUnicaId && !canchaUnica
  const showCanchaPicker = multipleCourts && canchas.length > 0 && !canchaUnicaId
  const courtSetupError = multipleCourts && canchas.length < 2
  const unassignedCourtSlots = visibleSlots.filter((slot) => !slot.canchaId).length
  const selectedCourtIsAvailable = canchas.some((court) => court.id === selectedCourtId)
    || (selectedCourtId === UNASSIGNED_COURT && unassignedCourtSlots > 0)
  const activeCourtFilter = showCanchaPicker
    ? (selectedCourtIsAvailable ? selectedCourtId : canchas[0]?.id ?? null)
    : null
  const displayedSlots = useMemo(() => {
    if (!activeCourtFilter) return visibleSlots
    if (activeCourtFilter === UNASSIGNED_COURT) return visibleSlots.filter((slot) => !slot.canchaId)
    return visibleSlots.filter((slot) => slot.canchaId === activeCourtFilter)
  }, [activeCourtFilter, visibleSlots])
  const daySlotCount = useMemo(() => {
    const count: Record<string, number> = {}
    for (const slot of displayedSlots) count[slot.fecha] = (count[slot.fecha] ?? 0) + 1
    return count
  }, [displayedSlots])

  useEffect(() => () => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
  }, [])

  useEffect(() => {
    if (!focusedSlotId || !displayedSlots.some((slot) => slot.id === focusedSlotId)) return
    const timeout = setTimeout(() => {
      const target = slotCardRefs.current[focusedSlotId]
      const scroller = activeScrollRef.current
      if (!target?.measureInWindow || !scroller?.measureInWindow || !scroller?.scrollTo) return
      target.measureInWindow((_x: number, targetY: number) => {
        scroller.measureInWindow((_scrollX: number, scrollY: number) => {
          scroller.scrollTo({ y: Math.max(0, activeScrollOffsetRef.current + targetY - scrollY - 120), animated: true })
        })
      })
    }, 120)
    return () => clearTimeout(timeout)
  }, [activeCourtFilter, activeScrollOffsetRef, activeScrollRef, displayedSlots, expandedDay, focusedSlotId])

  // Mirrors the store's own guard; must include the per-court config or editing one court's
  // hours would leave the generated slots stale.
  const courtSchedulesSnapshot = useMemo(() => (courtSchedules.size > 0
    ? JSON.stringify([...courtSchedules.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    : undefined), [courtSchedules])

  const scheduleConfigurationChanged = !!schedule && !!division && (
    schedule.slotDistributionVersion !== SLOT_DISTRIBUTION_VERSION
    || schedule.horarioSnapshot !== division.horarioPartido
    || schedule.diasSnapshot !== division.diasPartido
    || schedule.duracionSnapshot !== division.duracionPartido
    || schedule.descansoSnapshot !== (division.descanso ?? 0)
    || schedule.courtSchedulesSnapshot !== courtSchedulesSnapshot
  )
  const courtPlan = useMemo(
    () => availability && !canchaUnicaInactiva ? planFromAvailability(activeSlots, availability) : null,
    [activeSlots, availability, canchaUnicaInactiva],
  )
  const conflictSlotIds = useMemo(
    () => new Set(courtPlan?.conflicts.map((conflict) => conflict.slotId) ?? []),
    [courtPlan],
  )

  useEffect(() => {
    if (!multipleCourts || !courtPlan || canchaUnicaId) return
    const nextSlots = applyAutomaticCourtAssignments(slots, courtPlan.slots, canchas.map((court) => court.id))
    if (!nextSlots.some((slot, index) => slot.canchaId !== slots[index]?.canchaId)) return
    replaceSlots(divisionId, nextSlots)
  }, [canchas, canchaUnicaId, courtPlan, divisionId, multipleCourts, replaceSlots, slots])

  useEffect(() => {
    if (!schedule || !availability || !division?.horarioPartido || !division.duracionPartido || !division.diasPartido) return
    const hasFixedCourtMismatch = !!canchaUnicaId && slots.some((slot) => slot.canchaId !== canchaUnicaId)
    if (schedule.canchaUnicaIdSnapshot === canchaUnicaId && !hasFixedCourtMismatch) return

    if (!canchaUnicaId) {
      const nextSlots = schedule.canchaUnicaIdSnapshot === undefined
        ? slots
        : slots.map((slot) => ({ ...slot, canchaId: undefined }))
      syncCanchaUnica(divisionId, null, nextSlots)
      return
    }

    const candidates = generateSlots(
      division.diasPartido,
      division.horarioPartido,
      division.duracionPartido,
      division.descanso ?? 0,
      schedule.refDate,
      undefined,
      [canchaUnicaId],
    ).filter((candidate) => !isCourtOccupiedForSlot(candidate, canchaUnicaId, availability, []))
    const hasCapacity = candidates.length >= slots.length
    const nextSlots = slots.map((slot, index) => {
      const candidate = hasCapacity ? candidates[index] : undefined
      return {
        ...slot,
        fecha: candidate?.fecha ?? slot.fecha,
        horaInicio: candidate?.horaInicio ?? slot.horaInicio,
        horaFin: candidate?.horaFin ?? slot.horaFin,
        canchaId: canchaUnicaId,
      }
    })
    syncCanchaUnica(divisionId, canchaUnicaId, nextSlots)
    if (!hasCapacity && slots.length > 0) {
      toast.info("La cancha fija no tiene espacio suficiente para reacomodar todos los slots de esta semana")
    }
  }, [availability, canchaUnicaId, division?.descanso, division?.diasPartido, division?.duracionPartido, division?.horarioPartido, divisionId, schedule, slots, syncCanchaUnica, toast])

  const handleGenerateSlots = useCallback(() => {
    if (!division?.horarioPartido || !division?.duracionPartido || !division?.diasPartido) {
      toast.error("La división no tiene horario o días de partido configurados")
      return
    }
    if (availabilityQuery.isLoading) {
      toast.info("Verificando disponibilidad de canchas")
      return
    }
    if (availabilityQuery.error || !availability) {
      toast.error("No se pudo cargar la disponibilidad de canchas")
      return
    }
    if (courtSetupError) {
      toast.error("Configura al menos 2 canchas activas para usar el modo de múltiples canchas")
      return
    }
    if (canchaUnicaInactiva) {
      toast.error("La cancha fija de la división no está activa")
      return
    }
    const neededSlots = Math.floor((habilitados ?? []).length / 2)
    const eliminatoriaCount = slots.filter((slot) => slot.tipo === "eliminatoria").length
    const regularSlotsNeeded = Math.max(0, neededSlots - eliminatoriaCount)
    // Capacity is the sum over courts of (horarios de esa cancha × sus días), so a division
    // with per-court schedules can hold more matches than días × horarios.
    const weeklyCapacity = courtSchedules.size > 0
      ? [...courtSchedules.values()].reduce((total, courtSchedule) => total
          + generateTimeSlots(courtSchedule.horarioPartido, division.duracionPartido!, division.descanso ?? 0).length
            * parseDiasPartido(courtSchedule.diasPartido).length, 0)
      : generateTimeSlots(division.horarioPartido, division.duracionPartido, division.descanso ?? 0).length
        * parseDiasPartido(division.diasPartido).length
    if (regularSlotsNeeded > weeklyCapacity) {
      toast.info(`Se necesitan ${regularSlotsNeeded} slots, pero la semana solo tiene capacidad para ${weeklyCapacity}. Agrega más horarios o días de juego.`)
      return
    }
    setGenerating(true)
    const refDate = lastJornada?.fechaInicio ? computeRefDateFromJornada(lastJornada.fechaInicio) : undefined
    requestAnimationFrame(() => {
      initSchedule(divisionId, division.diasPartido!, division.horarioPartido!, division.duracionPartido!, division.descanso ?? 0, refDate, regularSlotsNeeded, habilitados, multipleCourts ? (canchaUnicaId ? [canchaUnicaId] : canchas.map((court) => court.id)) : [], canchaUnicaId, { courtSchedules })
      setTimeout(() => setGenerating(false), 250)
    })
  }, [availability, availabilityQuery.error, availabilityQuery.isLoading, canchas, canchaUnicaId, canchaUnicaInactiva, courtSchedules, courtSetupError, division, divisionId, habilitados, initSchedule, lastJornada, multipleCourts, slots, toast])

  useEffect(() => {
    if (!division?.horarioPartido || !division.duracionPartido || !division.diasPartido || !habilitados || habilitados.length < 2 || lastJornada === undefined || availabilityQuery.isLoading) return
    const hasManualEdits = slots.some((slot) => ((slot.equipoLocalId || slot.equipoVisitanteId) && slot.tipo !== "eliminatoria") || slot.tipo === "amistoso" || slot.tipo === "complemento") || !!schedule?.descansoEquipoId
    if (hasManualEdits && !scheduleConfigurationChanged) return
    if (!scheduleConfigurationChanged && slots.length > 0 && activeSlots.length >= Math.floor(habilitados.length / 2)) return
    const frame = requestAnimationFrame(handleGenerateSlots)
    return () => cancelAnimationFrame(frame)
  }, [activeSlots.length, availabilityQuery.isLoading, division?.diasPartido, division?.duracionPartido, division?.horarioPartido, habilitados, handleGenerateSlots, lastJornada, schedule?.descansoEquipoId, scheduleConfigurationChanged, slots])

  useEffect(() => {
    if (!autoOpenedRef.current && weekDates.length > 0) {
      const firstWithSlots = weekDates.find((fecha) => visibleSlots.some((slot) => slot.fecha === fecha))
      setExpandedDay(firstWithSlots ?? weekDates[0])
      autoOpenedRef.current = true
    }
  }, [weekDates, visibleSlots])

  function formatDateObj(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  // Fallback courts, in the same order as the filter tabs the user sees.
  // Empty for single-court and fixed-court divisions, so no other court is ever offered.
  // Only the courts this division actually plays on. Offering the rest would place slots the
  // backend rejects at generation ("no está configurada para jugar en …").
  const courtOrder = useMemo<(string | undefined)[]>(
    () => (showCanchaPicker ? [...courtSchedules.keys()] : []),
    [courtSchedules, showCanchaPicker],
  )

  // Courts the league already booked for another division are not valid landing spots.
  const addSlotCourtBlocked = useCallback(
    (courtId: string | undefined, fecha: string, horaInicio: string, horaFin: string) => {
      if (!courtId || !availability) return false
      return isCourtOccupiedForSlot({ id: "", fecha, horaInicio, horaFin, canchaId: courtId }, courtId, availability, [])
    },
    [availability],
  )

  const courtPickerBlockedFor = useCallback(
    (courtId: string, fecha: string) => (time: GeneratedTimeSlot) =>
      addSlotCourtBlocked(courtId, fecha, time.horaInicio, time.horaFin),
    [addSlotCourtBlocked],
  )

  // Days the court picker may fall back to when the target court is full on the slot's own day.
  // Past days are excluded, same rule the day picker applies.
  const courtMoveDates = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return weekDates.filter((fecha) => localDateFromString(fecha) >= tomorrow)
  }, [weekDates])

  const handleAddSlot = useCallback((tipo: 'regular' | 'amistoso' | 'complemento') => {
    if (tipo === 'regular' && atRegularLimit) {
      toast.info("Ya tienes los slots regulares necesarios para los equipos habilitados")
      return
    }
    // Prefer the court the user is currently looking at.
    // The viewed court is only a valid preference if the division plays there; otherwise fall
    // back to the first configured one so the slot never lands on an unconfigured court.
    const viewedCourt = showCanchaPicker && activeCourtFilter && activeCourtFilter !== UNASSIGNED_COURT
      ? activeCourtFilter
      : undefined
    const preferredCourtId = canchaUnicaId
      ?? (viewedCourt && courtSchedules.has(viewedCourt) ? viewedCourt : [...courtSchedules.keys()][0])
    const newSlot = addSlot(divisionId!, tipo, preferredCourtId, { courtOrder, isCourtBlocked: addSlotCourtBlocked })
    if (newSlot) {
      if (newSlot.canchaId) setSelectedCourtId(newSlot.canchaId)
      setExpandedDay(newSlot.fecha)
      setFocusedSlotId(newSlot.id)
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
      focusTimerRef.current = setTimeout(() => setFocusedSlotId(null), 3000)
    } else {
      toast.info("No hay horarios disponibles en esta semana")
    }
  }, [activeCourtFilter, addSlot, addSlotCourtBlocked, atRegularLimit, canchaUnicaId, courtOrder, courtSchedules, divisionId, showCanchaPicker, toast])

  // Real court bookings from the backend block a move just like draft slots do.
  // Only applies when a court is in play; single-court leagues keep the draft-only check.
  const dayMoveBlockedFor = useCallback((targetDate: string, courtId?: string) => {
    if (!dayPickerSlot || !courtId || !availability) return undefined
    return (time: GeneratedTimeSlot) => isCourtOccupiedForSlot(
      { ...dayPickerSlot, fecha: targetDate, horaInicio: time.horaInicio, horaFin: time.horaFin, canchaId: courtId },
      courtId,
      availability,
      [],
    )
  }, [availability, dayPickerSlot])

  // Free times on the slot's own court only — drives the "N horarios disponibles" label.
  const dayOptionsFor = useCallback((targetDate: string) => {
    if (!dayPickerSlot) return []
    return availableTimesForDay(
      dayPickerSlot,
      targetDate,
      activeSlots,
      horarioFor,
      division?.duracionPartido ?? 60,
      division?.descanso ?? 0,
      dayMoveBlockedFor(targetDate, dayPickerSlot.canchaId),
      diasFor,
    )
  }, [activeSlots, dayMoveBlockedFor, dayPickerSlot, diasFor, division?.descanso, division?.duracionPartido, horarioFor])

  // Own court first, then the rest — null when no court has room that day.
  const dayPlacementFor = useCallback((targetDate: string) => {
    if (!dayPickerSlot) return null
    return placementForDay(
      dayPickerSlot,
      targetDate,
      activeSlots,
      horarioFor,
      division?.duracionPartido ?? 60,
      division?.descanso ?? 0,
      courtOrder,
      (courtId) => dayMoveBlockedFor(targetDate, courtId),
      diasFor,
    )
  }, [activeSlots, courtOrder, dayMoveBlockedFor, dayPickerSlot, diasFor, division?.descanso, division?.duracionPartido, horarioFor])

  const applyDayMove = useCallback((slot: TimeSlotConfig, targetDate: string, placement: DayPlacement) => {
    replaceSlots(divisionId!, slots.map((s) => s.id === slot.id
      ? { ...s, fecha: targetDate, horaInicio: placement.horaInicio, horaFin: placement.horaFin, canchaId: placement.canchaId }
      : s))
    // Without this the slot would disappear behind the active court filter.
    if (placement.canchaId) setSelectedCourtId(placement.canchaId)
    setExpandedDay(targetDate)
    setFocusedSlotId(slot.id)
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
    focusTimerRef.current = setTimeout(() => setFocusedSlotId(null), 3000)
    setDayPickerSlot(null)
  }, [divisionId, replaceSlots, slots])

  const handleSelectDay = (targetDate: string) => {
    if (!dayPickerSlot) return
    const placement = dayPlacementFor(targetDate)
    if (!placement) {
      toast.info("El día seleccionado no tiene horarios disponibles")
      return
    }
    if (placement.canchaId === dayPickerSlot.canchaId) {
      applyDayMove(dayPickerSlot, targetDate, placement)
      return
    }
    setPendingCourtMove({
      slot: dayPickerSlot,
      fecha: targetDate,
      placement,
      courtName: canchas.find((court) => court.id === placement.canchaId)?.nombre ?? "otra cancha",
    })
    setDayPickerSlot(null)
  }

  const handleSelectTime = (horaInicio: string, horaFin: string) => {
    if (!timePickerSlot) return
    moveSlotToTime(divisionId!, timePickerSlot.id, horaInicio, horaFin)
    setTimePickerSlot(null)
  }

  const handleSelectTeam = (slotId: string, side: "local" | "visitante", teamId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) return
    if (side === "local") {
      setSlotTeams(divisionId!, slotId, teamId, slot.equipoVisitanteId)
    } else {
      setSlotTeams(divisionId!, slotId, slot.equipoLocalId, teamId)
    }
  }

  const handleClearSlot = useCallback((slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (!slot || slot.tipo === 'eliminatoria') return
    if (pendingDeleteSlotId === slotId) {
      removeSlot(divisionId!, slotId)
      setPendingDeleteSlotId(null)
    } else {
      clearSlot(divisionId!, slotId)
      setPendingDeleteSlotId(slotId)
    }
  }, [pendingDeleteSlotId, divisionId, clearSlot, removeSlot, slots])

  if (isLoading) {
    return (
      <View style={{ padding: Pad.xl, alignItems: "center" }}>
        <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans }}>Cargando...</Text>
      </View>
    )
  }

  if (divError || !division) {
    return <ErrorState message={(divError as Error).message} onRetry={() => refetchDiv()} />
  }

  const content = (
    <View style={{ gap: Gap.md }}>
      {availabilityQuery.isLoading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, padding: Pad.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md }}>
          <ActivityIndicator size="small" color={Palette.cyan} />
          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>Cargando disponibilidad de canchas...</Text>
        </View>
      ) : availabilityQuery.error ? (
        <TouchableOpacity onPress={() => availabilityQuery.refetch()} style={{ padding: Pad.md, backgroundColor: Palette.danger10, borderRadius: Radius.md }}>
          <Text style={{ color: Palette.danger, fontFamily: Fonts.semiBold, fontSize: 12 }}>No se pudo cargar la disponibilidad. Toca para reintentar.</Text>
        </TouchableOpacity>
      ) : availability ? (
        <View style={{ padding: Pad.md, gap: Gap.micro, backgroundColor: courtSetupError || canchaUnicaInactiva ? Palette.danger10 : Palette.cyan10, borderRadius: Radius.md }}>
          <Text style={{ color: courtSetupError || canchaUnicaInactiva ? Palette.danger : Palette.text, fontFamily: Fonts.semiBold, fontSize: 13 }}>
            {canchaUnicaId ? `Cancha fija: ${canchaUnica?.nombre ?? "inactiva"}` : availability.mode === "SINGLE" ? "Cancha única" : `${canchas.length} canchas activas`}
          </Text>
          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 11 }}>
            {canchaUnicaInactiva
              ? "Selecciona otra cancha desde Opciones de división."
              : courtSetupError
              ? "El modo múltiples canchas requiere al menos 2 canchas activas."
              : `${availability.ocupaciones.length} ocupaciones guardadas en el rango · ${courtPlan?.conflicts.length ?? 0} conflictos en borradores`}
          </Text>
        </View>
      ) : null}
      {habilitados && habilitados.length < 2 ? (
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, alignItems: "center", paddingVertical: Pad.xxl, paddingHorizontal: Pad.base, gap: Gap.md, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name="group" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, textAlign: "center" }}>Habilita al menos 2 equipos para continuar con la configuracion</Text>
        </View>
      ) : slots.length === 0 && !generating ? (
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, alignItems: "center", paddingVertical: Pad.xl, paddingHorizontal: Pad.base, gap: Gap.sm, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name="schedule" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, textAlign: "center" }}>{habilitados?.length ?? 0} equipos habilitados</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center" }}>Genera {Math.floor((habilitados?.length ?? 0) / 2)} slots para la próxima jornada</Text>
        </View>
      ) : (
        <View style={{ gap: Gap.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Pad.sm }}>
            <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.text }}>Slots ({slots.length})</Text>
            <TouchableOpacity onPress={() => setHelpOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="info-outline" size={18} color={Palette.cyan} />
            </TouchableOpacity>
          </View>

          {weekDates.length > 0 ? (
            <>
              {showCanchaPicker ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Pad.base }}>
                  <View style={{ flexDirection: "row", gap: Gap.sm, paddingHorizontal: Pad.base }}>
                    {canchas.map((cancha) => {
                      const isActive = activeCourtFilter === cancha.id
                      const count = visibleSlots.filter((slot) => slot.canchaId === cancha.id).length
                      return (
                        <TouchableOpacity
                          key={cancha.id}
                          onPress={() => setSelectedCourtId(cancha.id)}
                          activeOpacity={0.7}
                          style={{
                            backgroundColor: isActive ? Palette.cyan10 : Palette.surfaceLight,
                            borderRadius: Radius.md,
                            borderWidth: 1,
                            borderColor: isActive ? Palette.cyan : Palette.border,
                            paddingHorizontal: Pad.md,
                            paddingVertical: Pad.sm,
                            minWidth: 96,
                          }}
                        >
                          <Text style={{ color: isActive ? Palette.cyan : Palette.text, fontSize: 12, fontFamily: Fonts.semiBold }} numberOfLines={1}>{cancha.nombre}</Text>
                          <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans, marginTop: 2 }}>{count} slots</Text>
                        </TouchableOpacity>
                      )
                    })}
                    {unassignedCourtSlots > 0 ? (
                      <TouchableOpacity
                        onPress={() => setSelectedCourtId(UNASSIGNED_COURT)}
                        activeOpacity={0.7}
                        style={{
                          backgroundColor: activeCourtFilter === UNASSIGNED_COURT ? Palette.warning10 : Palette.surfaceLight,
                          borderRadius: Radius.md,
                          borderWidth: 1,
                          borderColor: activeCourtFilter === UNASSIGNED_COURT ? Palette.warning : Palette.border,
                          paddingHorizontal: Pad.md,
                          paddingVertical: Pad.sm,
                          minWidth: 96,
                        }}
                      >
                        <Text style={{ color: activeCourtFilter === UNASSIGNED_COURT ? Palette.warning : Palette.text, fontSize: 12, fontFamily: Fonts.semiBold }}>Sin asignar</Text>
                        <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans, marginTop: 2 }}>{unassignedCourtSlots} slots</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </ScrollView>
              ) : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Pad.base }}>
                <View style={{ flexDirection: "row", gap: Gap.sm, paddingHorizontal: Pad.base }}>
                  {weekDates.map((fecha) => {
                    const count = daySlotCount[fecha] ?? 0
                    const isActive = expandedDay === fecha
                    return (
                      <TouchableOpacity
                        key={fecha}
                        onPress={() => setExpandedDay(fecha)}
                        activeOpacity={0.7}
                        style={{
                          backgroundColor: Palette.surfaceLight,
                          borderRadius: Radius.md,
                          paddingHorizontal: Pad.md,
                          paddingVertical: Pad.sm,
                          alignItems: "center",
                          minWidth: 70,
                          borderWidth: 1,
                          borderColor: isActive ? Palette.cyan : Palette.border,
                        }}
                      >
                        <Text style={{ color: isActive ? Palette.cyan : Palette.text, fontSize: 12, fontFamily: Fonts.semiBold }}>
                          {DIA_NOMBRES[getDayOfWeek(fecha)]}
                        </Text>
                        <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans, marginTop: 2 }}>
                          {count}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </ScrollView>

              {weekDates.map((fecha) => {
                const daySlots = displayedSlots.filter((s) => s.fecha === fecha).sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio))
                const count = daySlotCount[fecha] ?? 0
                const isExpanded = expandedDay === fecha

                return (
                  <View key={fecha} style={{ borderRadius: Radius.lg, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
                    <TouchableOpacity
                      onPress={() => setExpandedDay(isExpanded ? null : fecha)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: Palette.surfaceLight,
                        paddingLeft: isExpanded ? Pad.sm : Pad.base,
                        paddingRight: Pad.base,
                        paddingVertical: Pad.md,
                        flexDirection: "row",
                        alignItems: "center",
                        borderLeftWidth: isExpanded ? 3 : 0,
                        borderLeftColor: Palette.cyan,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.text }}>
                          {formatFechaFull(fecha)}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: Fonts.sans, color: Palette.textMuted, marginTop: 2 }}>
                          {`${count} slot${count !== 1 ? "s" : ""}`}
                        </Text>
                      </View>
                      <MaterialIcons
                        name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                        size={22}
                        color={Palette.textMuted}
                      />
                    </TouchableOpacity>
                    {isExpanded ? (
                      <View style={{ padding: Pad.base, gap: Gap.md, backgroundColor: Palette.surfaceLight, borderTopWidth: 1, borderTopColor: Palette.border }}>
                        {generating ? (
                          <View style={{ padding: Pad.xl, alignItems: "center", gap: Gap.md }}>
                            <ActivityIndicator size="large" color={Palette.cyan} />
                            <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Configurando...</Text>
                          </View>
                        ) : daySlots.length > 0 ? daySlots.map((sl, slotIndex) => (
                          <View
                            key={`${sl.tipo === "eliminatoria" ? `partido-${sl.partidoId}` : `slot-${sl.id}`}-${sl.fecha}-${sl.horaInicio}-${slotIndex}`}
                            ref={(node) => {
                              if (node) slotCardRefs.current[sl.id] = node
                              else delete slotCardRefs.current[sl.id]
                            }}
                            collapsable={false}
                          >
                            <TimeSlotCard
                              slot={sl}
                              localNombre={divisionTeams.find((t) => t.id === sl.equipoLocalId)?.nombre}
                              visitanteNombre={divisionTeams.find((t) => t.id === sl.equipoVisitanteId)?.nombre}
                              canchaNombre={canchas.find((c: any) => c.id === sl.canchaId)?.nombre}
                              showDayPicker={validDays.length > 1}
                              showCanchaPicker={showCanchaPicker}
                              hasCourtConflict={conflictSlotIds.has(sl.id)}
                              focused={focusedSlotId === sl.id}
                              pendingDelete={pendingDeleteSlotId === sl.id}
                              onSelectDay={(s) => { disarmDelete(); setDayPickerSlot(s) }}
                              onClearSlot={handleClearSlot}
                              onAssignTeam={(id, side) => { disarmDelete(); setPickingSlot({ slotId: id, side }) }}
                              onChangeTime={(s) => { disarmDelete(); setTimePickerSlot(s) }}
                              onSelectCancha={(slotId) => { disarmDelete(); setCanchaPickerSlotId(slotId) }}
                            />
                          </View>
                        )) : (
                          <View style={{ backgroundColor: Palette.black, borderRadius: Radius.md, padding: Pad.md, alignItems: "center" }}>
                            <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Sin partidos programados</Text>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </>
          ) : null}

          {!playoffMode && habilitados && habilitados.length >= 3 && habilitados.length % 2 !== 0 && !hasComplementoSlot ? (
            <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.sm, borderWidth: 1, borderColor: schedule?.descansoEquipoId ? Palette.cyan : Palette.danger }}>
              <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>Con número impar de equipos, uno debe descansar esta jornada</Text>
              <TouchableOpacity onPress={() => setShowDescansoPicker(true)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <MaterialIcons name="hotel" size={18} color={Palette.cyan} />
                {schedule?.descansoEquipoId ? (
                  <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, flex: 1 }}>{divisionTeams.find((t) => t.id === schedule.descansoEquipoId)?.nombre}</Text>
                ) : (
                  <Text style={{ color: Palette.danger, fontSize: 14, fontFamily: Fonts.sans, flex: 1 }}>Obligatorio: elegir equipo que descansa</Text>
                )}
                <MaterialIcons name="keyboard-arrow-down" size={20} color={Palette.cyan} />
              </TouchableOpacity>
            </View>
          ) : null}

          {!playoffMode && habilitados && habilitados.length >= 3 && habilitados.length % 2 !== 0 && !hasComplementoSlot ? (
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans, marginTop: Gap.sm }}>O puedes agregar un partido Completar para que ese equipo no se quede sin jugar</Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: Gap.sm }}>
            {!playoffMode ? (
              <TouchableOpacity
                onPress={() => handleAddSlot('regular')}
                activeOpacity={0.7}
                style={{ flex: 1, backgroundColor: atRegularLimit ? Palette.dark60 : Palette.cyan, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm, opacity: atRegularLimit ? 0.5 : 1 }}
              >
                <MaterialIcons name="sports" size={18} color={atRegularLimit ? Palette.textMuted : Palette.black} />
                <Text style={{ color: atRegularLimit ? Palette.textMuted : Palette.black, fontSize: 13, fontFamily: Fonts.semiBold }}>Regular</Text>
              </TouchableOpacity>
            ) : null}
            {!playoffMode ? (
              <TouchableOpacity
                onPress={() => handleAddSlot('complemento')}
                activeOpacity={0.7}
                style={{ flex: 1, backgroundColor: Palette.warning, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm }}
              >
                <MaterialIcons name="group-add" size={18} color={Palette.black} />
                <Text style={{ color: Palette.black, fontSize: 13, fontFamily: Fonts.semiBold }}>Completar</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => handleAddSlot('amistoso')}
              activeOpacity={0.7}
              style={{ flex: 1, backgroundColor: Palette.success, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm }}
            >
              <MaterialIcons name="sports-kabaddi" size={18} color={Palette.black} />
              <Text style={{ color: Palette.black, fontSize: 13, fontFamily: Fonts.semiBold }}>Amistoso</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {(habilitados ?? []).length >= 2 ? (
        <View style={{ gap: Gap.sm, paddingTop: Gap.md, borderTopWidth: 1, borderTopColor: Palette.border }}>
          <TouchableOpacity
            activeOpacity={0.7}
             onPress={() => {
               if (availabilityQuery.isLoading) {
                 toast.info("Espera a que termine la verificación de canchas")
                 return
               }
               if (availabilityQuery.error || !availability) {
                 toast.error("No se pudo verificar la disponibilidad de canchas")
                 return
               }
                if (courtSetupError) {
                 toast.error("Configura al menos 2 canchas activas antes de generar")
                  return
                }
                if (canchaUnicaInactiva) {
                  toast.error("Selecciona una cancha fija activa desde Opciones de división")
                  return
                }
               if (courtPlan && courtPlan.conflicts.length > 0) {
                 toast.error("Hay conflictos de cancha visibles. Corrígelos antes de generar")
                 return
               }
              for (let i = 0; i < activeSlots.length; i++) {
                const current = activeSlots[i]
                const currentCanchaKey = current.canchaId ?? "__sin_cancha__"
                const currentInterval = getSlotInterval(current)
                if (!currentInterval) continue
                for (let j = i + 1; j < activeSlots.length; j++) {
                  const other = activeSlots[j]
                  const otherCanchaKey = other.canchaId ?? "__sin_cancha__"
                  if (otherCanchaKey !== currentCanchaKey) continue
                  const otherInterval = getSlotInterval(other)
                  if (!otherInterval) continue
                  if (currentInterval.start < otherInterval.end && currentInterval.end > otherInterval.start) {
                    const canchaNombre = current.canchaId ? canchas.find((c: any) => c.id === current.canchaId)?.nombre : null
                    toast.error(canchaNombre
                      ? `La cancha ${canchaNombre} tiene horarios solapados el ${current.fecha}`
                      : `Hay partidos con horarios solapados el ${current.fecha}`)
                    return
                  }
                }
              }
              const oddWithoutDescanso = !playoffMode && habilitados && habilitados.length >= 3 && habilitados.length % 2 !== 0 && !hasComplementoSlot && !schedule?.descansoEquipoId
              if (oddWithoutDescanso) {
                toast.error("Selecciona qué equipo descansa antes de generar la jornada")
                return
              }
              // Validate no team is in both eliminatoria and regular slots
              const elimTeamIds = new Set<string>()
              for (const sl of slots) {
                if (sl.tipo !== 'eliminatoria') continue
                if (sl.equipoLocalId) elimTeamIds.add(sl.equipoLocalId)
                if (sl.equipoVisitanteId) elimTeamIds.add(sl.equipoVisitanteId)
              }
              const conflictTeam = slots.find((sl) => {
                if (sl.tipo === 'eliminatoria' || sl.tipo === 'amistoso') return false
                if (sl.equipoLocalId && elimTeamIds.has(sl.equipoLocalId)) return true
                if (sl.tipo !== 'complemento' && sl.equipoVisitanteId && elimTeamIds.has(sl.equipoVisitanteId)) return true
                return false
              })
              if (conflictTeam) {
                const nombre = divisionTeams.find((t) => t.id === conflictTeam.equipoLocalId || t.id === conflictTeam.equipoVisitanteId)?.nombre
                toast.error(`El equipo ${nombre ?? 'desconocido'} está en eliminatoria y partido regular`)
                return
              }
              if (schedule?.descansoEquipoId && elimTeamIds.has(schedule.descansoEquipoId)) {
                toast.error("El equipo seleccionado para descansar está en eliminatoria")
                return
              }
              const incompleteAmistoso = !playoffMode && slots.find((s) => s.tipo === 'amistoso' && (!s.equipoLocalId || !s.equipoVisitanteId))
              if (incompleteAmistoso) {
                toast.error("Asigna ambos equipos al partido amistoso antes de generar la jornada")
                return
              }
              const incompleteComplemento = slots.find((s) => s.tipo === 'complemento' && (!s.equipoLocalId || !s.equipoVisitanteId))
              if (incompleteComplemento) {
                if (!incompleteComplemento.equipoLocalId && !incompleteComplemento.equipoVisitanteId) toast.error("Asigna ambos equipos del partido de complemento antes de generar la jornada")
                else if (!incompleteComplemento.equipoLocalId) toast.error("Asigna el equipo que gana puntos en el partido de complemento")
                else toast.error("Asigna el equipo que repetirá partido sin puntos en el complemento")
                return
              }
              onGenerateJornada()
            }}
            disabled={generating || isGeneratingJornada}
            style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", opacity: generating || isGeneratingJornada ? 0.6 : 1 }}
          >
            <Text style={{ color: Palette.black, fontSize: 15, fontFamily: Fonts.semiBold }}>
              {generating || isGeneratingJornada ? "Generando..." : "Generar jornada"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )

  const modals = (
    <>
      <TeamPickerModal
        visible={!!pickingSlot}
        pickingSlot={pickingSlot}
        slots={multipleCourts && timePickerSlot
          ? slots.filter((slot) => slot.id === timePickerSlot.id || (!!timePickerSlot.canchaId && slot.canchaId === timePickerSlot.canchaId))
          : slots}
        assignedTeams={pickerTeams}
        onSelectTeam={handleSelectTeam}
        onClearTeam={(slotId, side) => {
          const slot = slots.find((s) => s.id === slotId)
          if (!slot) return
          if (side === "local") setSlotTeams(divisionId!, slotId, undefined, slot.equipoVisitanteId)
          else setSlotTeams(divisionId!, slotId, slot.equipoLocalId, undefined)
        }}
        onClose={() => setPickingSlot(null)}
      />
      <TimePickerModal
        visible={!!timePickerSlot}
        currentSlotId={timePickerSlot?.id ?? ""}
        currentCanchaId={timePickerSlot?.canchaId}
        fecha={timePickerSlot?.fecha ?? ""}
        horarioPartido={horarioFor(timePickerSlot?.canchaId)}
        duracionPartido={division?.duracionPartido ?? 60}
        descanso={division?.descanso ?? 0}
        slots={slots}
        onSelectTime={handleSelectTime}
        onClose={() => setTimePickerSlot(null)}
      />

      <AppBottomSheetModal visible={!!dayPickerSlot} onClose={() => setDayPickerSlot(null)} title="Cambiar día" snapPoints={["55%"]}>
        <ScrollView>
          {weekDates.map((fecha) => {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)
            const targetDate = localDateFromString(fecha)
            const isCurrent = dayPickerSlot?.fecha === fecha
            const isPast = targetDate < tomorrow
            const available = dayOptionsFor(fecha)
            // Only look at other courts once the slot's own court has no room left that day.
            const fallback = !isCurrent && !isPast && available.length === 0 ? dayPlacementFor(fecha) : null
            const fallbackCourt = fallback ? canchas.find((court) => court.id === fallback.canchaId)?.nombre ?? "otra cancha" : null
            const disabled = isCurrent || isPast || (available.length === 0 && !fallback)
            const status = isCurrent
              ? "Día actual"
              : isPast
              ? "Día pasado"
              : available.length > 0
              ? `${available.length} horarios disponibles`
              : fallback
              ? dayPickerSlot?.canchaId
                ? `Tu cancha está llena · ${fallbackCourt} ${fallback.horaInicio}`
                : `Se asignará ${fallbackCourt} · ${fallback.horaInicio}`
              : "Sin horarios disponibles"
            return (
              <TouchableOpacity
                key={fecha}
                disabled={disabled}
                onPress={() => handleSelectDay(fecha)}
                style={{
                  backgroundColor: Palette.surfaceLight,
                  borderRadius: Radius.md,
                  borderWidth: 1,
                  borderColor: isCurrent ? Palette.cyan : fallback ? Palette.warning : Palette.border,
                  padding: Pad.md,
                  marginBottom: Gap.sm,
                  opacity: disabled && !isCurrent ? 0.45 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Gap.md,
                }}
              >
                <MaterialIcons
                  name={fallback ? "swap-horiz" : "calendar-today"}
                  size={20}
                  color={isCurrent ? Palette.cyan : fallback ? Palette.warning : Palette.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>{formatFechaFull(fecha)}</Text>
                  <Text style={{ color: isCurrent ? Palette.cyan : fallback ? Palette.warning : Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>{status}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </AppBottomSheetModal>

      <ConfirmationModal
        visible={!!pendingCourtMove}
        title={pendingCourtMove?.slot.canchaId ? "Tu cancha está llena ese día" : "Este partido no tiene cancha"}
        message={pendingCourtMove
          ? `¿Mover el partido a la ${pendingCourtMove.courtName} a las ${pendingCourtMove.placement.horaInicio}?`
          : ""}
        highlightText={pendingCourtMove?.courtName}
        confirmLabel="Mover"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={() => {
          if (!pendingCourtMove) return
          applyDayMove(pendingCourtMove.slot, pendingCourtMove.fecha, pendingCourtMove.placement)
          setPendingCourtMove(null)
        }}
        onClose={() => {
          // Reopen the day sheet exactly as it was — nothing has been mutated.
          if (pendingCourtMove) setDayPickerSlot(pendingCourtMove.slot)
          setPendingCourtMove(null)
        }}
      />

      <AppBottomSheetModal visible={showDescansoPicker} onClose={() => setShowDescansoPicker(false)} title="Equipo que descansa" snapPoints={["70%"]}>
        <ScrollView>
          <TouchableOpacity
            onPress={() => { setDescansoEquipoId(divisionId!, undefined); setShowDescansoPicker(false) }}
            style={{ backgroundColor: Palette.danger, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", marginBottom: Gap.sm }}
          >
            <Text style={{ color: Palette.white, fontWeight: "600", fontSize: 14 }}>Ninguno (automático)</Text>
          </TouchableOpacity>
          {assignedTeams.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => { setDescansoEquipoId(divisionId!, t.id); setShowDescansoPicker(false) }}
              style={{
                backgroundColor: schedule?.descansoEquipoId === t.id ? Palette.cyan : Palette.surfaceLight,
                borderRadius: Radius.md,
                padding: Pad.md,
                marginBottom: Gap.sm,
              }}
            >
              <Text style={{ color: schedule?.descansoEquipoId === t.id ? Palette.black : Palette.text, fontWeight: "600", fontSize: 14 }}>{t.nombre}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowDescansoPicker(false)} style={{ paddingVertical: Pad.md, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontWeight: "600", fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </AppBottomSheetModal>

      <AppBottomSheetModal
        visible={multipleCourts && canchas.length > 0 && canchaPickerSlotId !== null}
        onClose={() => setCanchaPickerSlotId(null)}
        title="Seleccionar cancha"
        snapPoints={["50%"]}
      >
        <ScrollView>
          {(() => {
            const pickerSlot = activeSlots.find((slot) => slot.id === canchaPickerSlotId)
            return canchas.map((c) => {
              // Keeps the slot's hour when it is free on that court, otherwise the earliest one.
              const landing = pickerSlot
                ? timeForCourt(
                    pickerSlot,
                    c.id,
                    activeSlots,
                    horarioFor,
                    division?.duracionPartido ?? 60,
                    division?.descanso ?? 0,
                    (fecha) => courtPickerBlockedFor(c.id, fecha),
                    { candidateDates: courtMoveDates, diasPartido: diasFor },
                  )
                : null
              const isCurrent = pickerSlot?.canchaId === c.id
              // Shown but blocked rather than hidden: a slot already sitting on an unconfigured
              // court still needs this sheet to move out of it.
              const notConfigured = !courtSchedules.has(c.id)
              const movesDay = !!landing && landing.fecha !== pickerSlot?.fecha
              const movesTime = !!landing && landing.horaInicio !== pickerSlot?.horaInicio
              const disabled = isCurrent || notConfigured || !landing
              const suffix = isCurrent
                ? " · Actual"
                : notConfigured
                ? " · No configurada"
                : !landing
                ? " · Sin horarios"
                : movesDay
                ? ` · ${DIA_NOMBRES[getDayOfWeek(landing.fecha)]} ${landing.horaInicio}`
                : movesTime ? ` · ${landing.horaInicio}` : ""
              return (
                <TouchableOpacity
                  key={c.id}
                  disabled={disabled}
                  onPress={() => {
                    setSlotCancha(divisionId!, canchaPickerSlotId!, c.id, landing!)
                    // Sin esto el partido queda fuera de la vista si cambió de día.
                    setExpandedDay(landing!.fecha)
                    setCanchaPickerSlotId(null)
                  }}
                  style={{
                    backgroundColor: Palette.surfaceLight,
                    borderRadius: Radius.md,
                    padding: Pad.md,
                    marginBottom: Gap.sm,
                    borderWidth: 1,
                    borderColor: isCurrent ? Palette.cyan : (movesDay || movesTime) && !notConfigured ? Palette.warning : Palette.border,
                    opacity: notConfigured || !landing ? 0.45 : 1,
                  }}
                >
                  <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>
                    {c.nombre}
                    <Text style={{ color: (movesDay || movesTime) && !notConfigured ? Palette.warning : Palette.textMuted }}>{suffix}</Text>
                  </Text>
                </TouchableOpacity>
              )
            })
          })()}
          <TouchableOpacity onPress={() => setCanchaPickerSlotId(null)} style={{ paddingVertical: Pad.md, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </AppBottomSheetModal>

      <AppBottomSheetModal
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Información de slots"
        snapPoints={["80%"]}
      >
        <ScrollView contentContainerStyle={{ gap: Gap.sm }}>
          <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, marginBottom: Gap.micro }}>Tipos de partido</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md, borderLeftWidth: 4, borderLeftColor: Palette.cyan }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${Palette.cyan}30`, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="check-circle" size={18} color={Palette.cyan} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Regular</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Ambos equipos suman puntos en la tabla general. Es el tipo por defecto.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md, borderLeftWidth: 4, borderLeftColor: Palette.success }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.success10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="favorite" size={18} color={Palette.success} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Amistoso</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Ningún equipo suma puntos en la tabla. Ideal para pruebas o fechas especiales.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md, borderLeftWidth: 4, borderLeftColor: Palette.warning }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.warning10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="add-circle" size={18} color={Palette.warning} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Completar</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Solo el equipo local suma puntos; el visitante no. Se usa con número impar de equipos.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md, borderLeftWidth: 4, borderLeftColor: Palette.playoff }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.playoff10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="emoji-events" size={18} color={Palette.playoff} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Eliminatoria</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Eliminación directa. Los slots se asignan automáticamente desde las rondas de playoff.</Text>
            </View>
          </View>

          <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, marginTop: Gap.md, marginBottom: Gap.micro }}>Acciones del slot</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="access-time" size={18} color={Palette.cyan} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Cambiar hora</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Selecciona otro horario válido y disponible dentro del rango configurado para la división.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="calendar-today" size={17} color={Palette.cyan} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Cambiar día</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Selecciona otro día configurado. Conserva la hora si está libre o usa la siguiente disponible.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: Palette.warning10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="place" size={18} color={Palette.warning} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Cambiar cancha</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>Mueve el slot a otra cancha. Esta acción aparece cuando la liga usa múltiples canchas.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: Palette.danger10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="delete-outline" size={18} color={Palette.danger} />
            </View>
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Limpiar o eliminar</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans }}>El primer toque limpia los equipos; vuelve a tocar para eliminar el slot. No aplica a eliminatorias.</Text>
            </View>
          </View>
        </ScrollView>
      </AppBottomSheetModal>
    </>
  )

  if (embedded) {
    return <>{content}{modals}</>
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <PullToRefresh
        onRefresh={handleRefresh}
        refreshing={refreshing}
        scrollRef={internalScrollRef}
        onScroll={(event) => { internalScrollOffsetRef.current = event.nativeEvent.contentOffset.y }}
      >
        <View style={{ padding: Pad.base, gap: Gap.md, paddingBottom: 48 }}>
          {content}
        </View>
      </PullToRefresh>
      {modals}
    </View>
  )
}
