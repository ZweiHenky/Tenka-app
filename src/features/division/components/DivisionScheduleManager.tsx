import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { divisionApi } from "@/features/division/api/divisions"
import { useDivisionEquipos } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useTeams } from "@/features/team/hooks/useTeams"
import TimeSlotCard from "@/features/division/components/TimeSlotCard"
import TeamPickerModal from "@/features/division/components/TeamPickerModal"
import TimePickerModal from "@/features/division/components/TimePickerModal"
import ErrorState from "@/shared/components/ErrorState"
import PullToRefresh from "@/shared/components/PullToRefresh"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { useDivisionScheduleStore, computeRefDateFromJornada, ensureUniqueSlotIds, generateSlots, getActiveSlots, isSlotManual, localDateFromString, reconcilePlayoffSlots, type PlayoffSlotCandidate, type TimeSlotConfig } from "@/stores/divisionSchedule"
import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"
import { useRondasPlayoff } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import { useToast } from "@/shared/components/Toast"
import { useCourtAvailability } from "@/features/court-availability/hooks/useCourtAvailability"
import { applyAutomaticCourtAssignments, isCourtOccupiedForSlot, planFromAvailability } from "@/features/court-availability/planner"

const DIA_NOMBRES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DIA_NOMBRES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

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

function parseRanges(horario: string): { start: string; end: string }[] {
  if (!horario) return []
  return horario.split(" / ").map((r) => {
    let parts = r.split(" - ").map((s) => s.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    parts = r.split("-").map((s) => s.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    return null
  }).filter(Boolean) as { start: string; end: string }[]
}

function generaTiemposUnicos(horarioPartido: string, duracion: number, descanso: number, count: number, ocupados: Set<string>): { horaInicio: string; horaFin: string }[] {
  const ranges = parseRanges(horarioPartido)
  if (ranges.length === 0) return Array(count).fill({ horaInicio: "08:00", horaFin: "09:00" })
  const slotTotal = duracion + descanso
  const parseM = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0) }
  const result: { horaInicio: string; horaFin: string }[] = []
  for (const range of ranges) {
    if (result.length >= count) break
    const inicioMin = parseM(range.start)
    const finMin = parseM(range.end)
    let current = inicioMin
    while (result.length < count && current + duracion <= finMin) {
      const hi = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`
      const hf = `${String(Math.floor((current + duracion) / 60)).padStart(2, "0")}:${String((current + duracion) % 60).padStart(2, "0")}`
      if (!ocupados.has(`${hi}-${hf}`)) {
        result.push({ horaInicio: hi, horaFin: hf })
      }
      current += slotTotal
    }
  }
  return result
}

interface Props {
  divisionId: string
  embedded?: boolean
  isGeneratingJornada: boolean
  onGenerateJornada: () => void
}

export default function DivisionScheduleManager({ divisionId, embedded, isGeneratingJornada, onGenerateJornada }: Props) {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: division, isLoading, error: divError, refetch: refetchDiv } = useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId!),
    enabled: !!divisionId,
  })

  const { data: links = [] } = useDivisionEquipos(divisionId!)
  const { data: allTeams = [] } = useTeams()
  const schedule = useDivisionScheduleStore((s) => (divisionId ? s.schedules[divisionId] : undefined))
  const initSchedule = useDivisionScheduleStore((s) => s.initSchedule)
  const setSlotTeams = useDivisionScheduleStore((s) => s.setSlotTeams)
  const setSlotCancha = useDivisionScheduleStore((s) => s.setSlotCancha)
  const clearSlot = useDivisionScheduleStore((s) => s.clearSlot)
  const addSlot = useDivisionScheduleStore((s) => s.addSlot)
  const removeSlot = useDivisionScheduleStore((s) => s.removeSlot)
  const replaceSlots = useDivisionScheduleStore((s) => s.replaceSlots)
  const syncCanchaUnica = useDivisionScheduleStore((s) => s.syncCanchaUnica)
  const moveSlotToDay = useDivisionScheduleStore((s) => s.moveSlotToDay)
  const moveSlotToTime = useDivisionScheduleStore((s) => s.moveSlotToTime)
  const setDescansoEquipoId = useDivisionScheduleStore((s) => s.setDescansoEquipoId)
  const setPlayoffMode = useDivisionScheduleStore((s) => s.setPlayoffMode)
  const clearEliminatoriaSlots = useDivisionScheduleStore((s) => s.clearEliminatoriaSlots)
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const advanceSchedule = useDivisionScheduleStore((s) => s.advanceSchedule)

  const ligaId = division?.ligaId

  const [pickingSlot, setPickingSlot] = useState<{ slotId: string; side: "local" | "visitante" } | null>(null)
  const [timePickerSlot, setTimePickerSlot] = useState<TimeSlotConfig | null>(null)
  const [showDescansoPicker, setShowDescansoPicker] = useState(false)
  const [canchaPickerSlotId, setCanchaPickerSlotId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const autoOpenedRef = useRef(false)

  const disarmDelete = useCallback(() => setPendingDeleteSlotId(null), [])

  const { data: rondas = [], isSuccess: rondasLoaded } = useRondasPlayoff(divisionId!)
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
  const activeSlots = useMemo(() => getActiveSlots(slots, habilitados?.length ?? 0, playoffMode), [slots, habilitados, playoffMode])
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

  const daySlotCount = useMemo(() => {
    const count: Record<string, number> = {}
    for (const sl of visibleSlots) {
      count[sl.fecha] = (count[sl.fecha] ?? 0) + 1
    }
    return count
  }, [visibleSlots])

  const partidosEliminatoria = useMemo(() => rondas.flatMap((ronda) =>
    ronda.partidos.map((partido) => ({
      id: partido.id,
      rondaNombre: ronda.nombre,
      llave: partido.llave ?? 0,
      equipoLocalId: partido.equipoLocalId,
      equipoVisitanteId: partido.equipoVisitanteId,
      estado: partido.estado,
    })),
  ), [rondas])

  useEffect(() => {
    if (!divisionId || !playoffMode || partidosEliminatoria.length === 0) return

    const uniquePartidos = partidosEliminatoria.filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    )

    const authoritativeIds = new Set(uniquePartidos.map((p) => p.id))
    const finalizedIds = new Set(uniquePartidos.filter((p) => p.estado === "FINALIZADO").map((p) => p.id))
    let slotsToKeep = slots.filter((s) => {
      if (s.tipo !== 'eliminatoria') return true
      return !!s.partidoId && authoritativeIds.has(s.partidoId) && !finalizedIds.has(s.partidoId)
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

    const pending = uniquePartidos.filter((p) => p.estado !== "FINALIZADO")
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

    const ranges = parseRanges(division?.horarioPartido ?? "08:00-20:00")
    const slotTotal = (division?.duracionPartido ?? 60) + (division?.descanso ?? 0)
    const duracion = division?.duracionPartido ?? 60

    const dayTimeSlots: { horaInicio: string; horaFin: string }[] = []
    for (const range of ranges) {
      const parseM = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0) }
      let current = parseM(range.start)
      const finMin = parseM(range.end)
      while (current + duracion <= finMin) {
        dayTimeSlots.push({
          horaInicio: `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`,
          horaFin: `${String(Math.floor((current + duracion) / 60)).padStart(2, "0")}:${String((current + duracion) % 60).padStart(2, "0")}`,
        })
        current += slotTotal
      }
    }

    const candidates: PlayoffSlotCandidate[] = []
    const cursor = localDateFromString(refDate)
    for (let d = 0; d < 60; d++) {
      if (validDays.includes(cursor.getDay())) {
        const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
        for (const ts of dayTimeSlots) {
          candidates.push({ fecha, horaInicio: ts.horaInicio, horaFin: ts.horaFin })
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }

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
  }, [partidosEliminatoria, divisionId, division?.horarioPartido, division?.duracionPartido, division?.descanso, division?.diasPartido, habilitados, slots, replaceSlots, schedule?.descansoEquipoId, schedule?.refDate, setDescansoEquipoId, playoffMode])

  const { data: lastJornada } = useQuery({
    queryKey: ["last-jornada", divisionId],
    queryFn: async () => {
      const result = await jornadaApi.listByDivisionPaginated(divisionId!, 1, 1)
      return result.rows?.[0] ?? null
    },
    enabled: !!divisionId,
  })

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["division", divisionId] }),
        qc.invalidateQueries({ queryKey: ["division-equipos", divisionId] }),
        qc.invalidateQueries({ queryKey: ["teams"] }),
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
    if (!lastJornada?.fechaInicio) return
    const expectedRefDate = computeRefDateFromJornada(lastJornada.fechaInicio)
    if (!expectedRefDate) return
    if (schedule?.refDate && schedule.refDate !== expectedRefDate) {
      advanceSchedule(divisionId!, lastJornada.fechaInicio)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastJornada?.fechaInicio, schedule?.refDate])

  const assignedTeams = useMemo(
    () => {
      const divisionTeams = allTeams.filter((t) => links.some((l) => l.equipoId === t.id))
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
    [allTeams, links, habilitados, activeSlots],
  )

  const pickerTeams = useMemo(() => {
    if (!pickingSlot) return assignedTeams
    const currentSlot = slots.find((s) => s.id === pickingSlot.slotId)
    if (!currentSlot) return assignedTeams
    const tipo = currentSlot.tipo ?? 'regular'
    const isComplementoSinPuntos = tipo === 'complemento' && pickingSlot.side === 'visitante'
    const isAmistoso = tipo === 'amistoso'
    if (isComplementoSinPuntos || isAmistoso) {
      const divisionTeams = allTeams.filter((t) => links.some((l) => l.equipoId === t.id))
      const habSet = new Set(habilitados ?? [])
      return divisionTeams.filter((t) => habSet.has(t.id))
    }
    return assignedTeams
  }, [pickingSlot, slots, assignedTeams, allTeams, links, habilitados])

  const validDays = useMemo(() => {
    if (!division?.diasPartido) return []
    return parseDiasPartido(division.diasPartido)
  }, [division])

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
  const availabilityQuery = useCourtAvailability(ligaId, availabilityRange?.inicio, availabilityRange?.fin)
  const availability = availabilityQuery.data
  const canchas = useMemo(() => availability?.canchas ?? [], [availability?.canchas])
  const multipleCourts = availability?.mode === "MULTIPLE"
  const canchaUnicaId = division?.canchaUnicaId ?? null
  const canchaUnica = canchas.find((cancha) => cancha.id === canchaUnicaId)
  const canchaUnicaInactiva = !!canchaUnicaId && !canchaUnica
  const showCanchaPicker = multipleCourts && canchas.length > 0 && !canchaUnicaId
  const courtSetupError = multipleCourts && canchas.length < 2
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
    const ranges = parseRanges(division.horarioPartido)
    const slotTotal = division.duracionPartido + (division.descanso ?? 0)
    const perDay = ranges.reduce((total, range) => total + Math.floor((timeToMinutes(range.end) - timeToMinutes(range.start)) / slotTotal), 0)
    const weeklyCapacity = perDay * parseDiasPartido(division.diasPartido).length * (multipleCourts && !canchaUnicaId ? canchas.length : 1)
    if (regularSlotsNeeded > weeklyCapacity) {
      toast.info(`Se necesitan ${regularSlotsNeeded} slots, pero la semana solo tiene capacidad para ${weeklyCapacity}. Agrega más horarios o días de juego.`)
      return
    }
    setGenerating(true)
    const refDate = lastJornada?.fechaInicio ? computeRefDateFromJornada(lastJornada.fechaInicio) : undefined
    requestAnimationFrame(() => {
      initSchedule(divisionId, division.diasPartido!, division.horarioPartido!, division.duracionPartido!, division.descanso ?? 0, refDate, regularSlotsNeeded, habilitados, multipleCourts ? (canchaUnicaId ? [canchaUnicaId] : canchas.map((court) => court.id)) : [], canchaUnicaId)
      setTimeout(() => setGenerating(false), 250)
    })
  }, [availability, availabilityQuery.error, availabilityQuery.isLoading, canchas, canchaUnicaId, canchaUnicaInactiva, courtSetupError, division, divisionId, habilitados, initSchedule, lastJornada, multipleCourts, slots, toast])

  useEffect(() => {
    if (!division?.horarioPartido || !division.duracionPartido || !division.diasPartido || !habilitados || habilitados.length < 2 || lastJornada === undefined || availabilityQuery.isLoading) return
    const hasManualEdits = slots.some((slot) => ((slot.equipoLocalId || slot.equipoVisitanteId) && slot.tipo !== "eliminatoria") || slot.tipo === "amistoso" || slot.tipo === "complemento") || !!schedule?.descansoEquipoId
    if (hasManualEdits) return
    if (slots.length > 0 && activeSlots.length >= Math.floor(habilitados.length / 2)) return
    const frame = requestAnimationFrame(handleGenerateSlots)
    return () => cancelAnimationFrame(frame)
  }, [activeSlots.length, availabilityQuery.isLoading, division?.diasPartido, division?.duracionPartido, division?.horarioPartido, habilitados, handleGenerateSlots, lastJornada, schedule?.descansoEquipoId, slots])

  useEffect(() => {
    if (!autoOpenedRef.current && weekDates.length > 0) {
      const firstWithSlots = weekDates.find((fecha) => visibleSlots.some((slot) => slot.fecha === fecha))
      setExpandedDay(firstWithSlots ?? weekDates[0])
      autoOpenedRef.current = true
    }
  }, [weekDates, visibleSlots])

  function getMondayOfWeek(fechaStr: string): Date {
    const [y, m, d] = fechaStr.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    date.setHours(0, 0, 0, 0)
    return date
  }

  function formatDateObj(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  function dayToWeekOffset(d: number): number {
    return d === 0 ? 6 : d - 1
  }

  const handleAddSlot = useCallback((tipo: 'regular' | 'amistoso' | 'complemento') => {
    if (tipo === 'regular' && atRegularLimit) {
      toast.info("Ya tienes los slots regulares necesarios para los equipos habilitados")
      return
    }
    const newSlot = addSlot(divisionId!, tipo)
    if (newSlot) {
      setExpandedDay(newSlot.fecha)
    } else {
      toast.info("No hay horarios disponibles en esta semana")
    }
  }, [divisionId, addSlot, atRegularLimit, toast])

  const cycleDay = (sl: TimeSlotConfig) => {
    if (validDays.length <= 1) return

    const currentDay = getDayOfWeek(sl.fecha)
    const currentIdx = validDays.indexOf(currentDay)
    const startIdx = currentIdx === -1 ? 0 : currentIdx
    const maxCycle = currentIdx === -1 ? validDays.length : validDays.length - 1

    const weekMonday = getMondayOfWeek(sl.fecha)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    for (let cycle = 1; cycle <= maxCycle; cycle++) {
      const targetDay = validDays[(startIdx + cycle) % validDays.length]
      const targetDate = new Date(weekMonday)
      targetDate.setDate(weekMonday.getDate() + dayToWeekOffset(targetDay))
      const newFechaStr = formatDateObj(targetDate)

      if (targetDate < tomorrow) continue

      if (moveSlotToDay(divisionId!, sl.id, newFechaStr)) return

      const free = generaTiemposUnicos(
        division?.horarioPartido ?? "08:00-20:00",
        division?.duracionPartido ?? 60,
        division?.descanso ?? 0,
        1,
        new Set(slots.filter((o) => o.fecha === newFechaStr).map((o) => `${o.horaInicio}-${o.horaFin}`)),
      )

      if (free.length > 0) {
        const sched = useDivisionScheduleStore.getState().schedules[divisionId!]
        if (!sched) return
        replaceSlots(divisionId!, sched.slots.map((x) =>
          x.id === sl.id ? { ...x, fecha: newFechaStr, horaInicio: free[0].horaInicio, horaFin: free[0].horaFin } : x
        ))
        return
      }
    }
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
                const daySlots = visibleSlots.filter((s) => s.fecha === fecha).sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio))
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
                          <TimeSlotCard
                            key={`${sl.tipo === "eliminatoria" ? `partido-${sl.partidoId}` : `slot-${sl.id}`}-${sl.fecha}-${sl.horaInicio}-${slotIndex}`}
                            slot={sl}
                            localNombre={allTeams.find((t) => t.id === sl.equipoLocalId)?.nombre}
                            visitanteNombre={allTeams.find((t) => t.id === sl.equipoVisitanteId)?.nombre}
                            canchaNombre={canchas.find((c: any) => c.id === sl.canchaId)?.nombre}
                            showSwapIcon={validDays.length > 1}
                             showCanchaPicker={showCanchaPicker}
                             hasCourtConflict={conflictSlotIds.has(sl.id)}
                            pendingDelete={pendingDeleteSlotId === sl.id}
                            onCycleDay={(s) => { disarmDelete(); cycleDay(s) }}
                            onClearSlot={handleClearSlot}
                            onAssignTeam={(id, side) => { disarmDelete(); setPickingSlot({ slotId: id, side }) }}
                            onChangeTime={(s) => { disarmDelete(); setTimePickerSlot(s) }}
                            onSelectCancha={(slotId) => { disarmDelete(); setCanchaPickerSlotId(slotId) }}
                          />
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
                  <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, flex: 1 }}>{allTeams.find((t) => t.id === schedule.descansoEquipoId)?.nombre}</Text>
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
                const nombre = allTeams.find((t) => t.id === conflictTeam.equipoLocalId || t.id === conflictTeam.equipoVisitanteId)?.nombre
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
              const incompleteComplemento = slots.find((s) => s.tipo === 'complemento' && !s.equipoLocalId)
              if (incompleteComplemento) {
                toast.error("Asigna el equipo que obtiene puntos antes de generar la jornada")
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
        fecha={timePickerSlot?.fecha ?? ""}
        horarioPartido={division?.horarioPartido ?? "08:00-20:00"}
        duracionPartido={division?.duracionPartido ?? 60}
        descanso={division?.descanso ?? 0}
        slots={slots}
        onSelectTime={handleSelectTime}
        onClose={() => setTimePickerSlot(null)}
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
          {canchas.map((c) => {
            const pickerSlot = slots.find((slot) => slot.id === canchaPickerSlotId)
            const occupied = !!pickerSlot && !!availability && isCourtOccupiedForSlot(pickerSlot, c.id, availability, slots)
            return (
            <TouchableOpacity
              key={c.id}
              disabled={occupied}
              onPress={() => { setSlotCancha(divisionId!, canchaPickerSlotId!, c.id); setCanchaPickerSlotId(null) }}
              style={{
                backgroundColor: Palette.surfaceLight,
                borderRadius: Radius.md,
                padding: Pad.md,
                marginBottom: Gap.sm,
                borderWidth: 1,
                borderColor: slots.find((s) => s.id === canchaPickerSlotId)?.canchaId === c.id ? Palette.cyan : Palette.border,
                opacity: occupied ? 0.45 : 1,
              }}
            >
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>{c.nombre}{occupied ? " · Ocupada" : ""}</Text>
            </TouchableOpacity>
          )})}
          <TouchableOpacity onPress={() => setCanchaPickerSlotId(null)} style={{ paddingVertical: Pad.md, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </AppBottomSheetModal>

      <AppBottomSheetModal
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Tipos de partido"
        snapPoints={["50%"]}
      >
        <ScrollView contentContainerStyle={{ gap: Gap.sm }}>
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
        </ScrollView>
      </AppBottomSheetModal>
    </>
  )

  if (embedded) {
    return <>{content}{modals}</>
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
        <View style={{ padding: Pad.base, gap: Gap.md, paddingBottom: 48 }}>
          {content}
        </View>
      </PullToRefresh>
      {modals}
    </View>
  )
}
