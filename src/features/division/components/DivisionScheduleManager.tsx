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
import { useDivisionScheduleStore, computeRefDateFromJornada, getActiveSlots, isSlotManual, localDateFromString, type TimeSlotConfig } from "@/stores/divisionSchedule"
import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"
import { useRondasPlayoff } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import { partidoApi } from "@/features/partido/api/partidos"
import { useToast } from "@/shared/components/Toast"
import { api } from "@/infrastructure/api/client"

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
  const setAllSlotsCancha = useDivisionScheduleStore((s) => s.setAllSlotsCancha)
  const clearSlot = useDivisionScheduleStore((s) => s.clearSlot)
  const addSlot = useDivisionScheduleStore((s) => s.addSlot)
  const removeSlot = useDivisionScheduleStore((s) => s.removeSlot)
  const replaceSlots = useDivisionScheduleStore((s) => s.replaceSlots)
  const moveSlotToDay = useDivisionScheduleStore((s) => s.moveSlotToDay)
  const moveSlotToTime = useDivisionScheduleStore((s) => s.moveSlotToTime)
  const setDescansoEquipoId = useDivisionScheduleStore((s) => s.setDescansoEquipoId)
  const setPlayoffMode = useDivisionScheduleStore((s) => s.setPlayoffMode)
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const advanceSchedule = useDivisionScheduleStore((s) => s.advanceSchedule)

  const ligaId = division?.ligaId
  const { data: canchas = [] } = useQuery({
    queryKey: ["ligas-canchas", ligaId],
    queryFn: () => api.get(`/api/ligas/${ligaId}/canchas`).then((r) => r.data.data ?? []),
    enabled: !!ligaId,
  })
  const showCanchaPicker = canchas.length > 0

  const [pickingSlot, setPickingSlot] = useState<{ slotId: string; side: "local" | "visitante" } | null>(null)
  const [timePickerSlot, setTimePickerSlot] = useState<TimeSlotConfig | null>(null)
  const [showDescansoPicker, setShowDescansoPicker] = useState(false)
  const [canchaPickerSlotId, setCanchaPickerSlotId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string | null>(null)
  const autoOpenedRef = useRef(false)

  const disarmDelete = useCallback(() => setPendingDeleteSlotId(null), [])

  const { data: rondas = [] } = useRondasPlayoff(divisionId!)
  const playoffMode = rondas.length > 0

  useEffect(() => {
    if (!divisionId) return
    if (playoffMode) {
      setPlayoffMode(divisionId, true)
    }
  }, [divisionId, playoffMode, setPlayoffMode])

  const slots = useMemo(() => schedule?.slots ?? [], [schedule])
  const activeSlots = useMemo(() => getActiveSlots(slots, habilitados?.length ?? 0, playoffMode), [slots, habilitados, playoffMode])
  const hasExtraSlots = useMemo(() => activeSlots.some((s) => s.tipo === 'amistoso' || s.tipo === 'complemento'), [activeSlots])
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

  const { data: partidosEliminatoria = [] } = useQuery({
    queryKey: ["partidos-eliminatoria-todos", divisionId],
    queryFn: async () => {
      const results: { id: string; rondaNombre: string; llave: number; equipoLocalId: string | null; equipoVisitanteId: string | null; estado: string | null }[] = []
      for (const r of rondas) {
        const partidos = await partidoApi.findByRondaPlayoff(r.id)
        for (const p of partidos) {
          results.push({ id: p.id, rondaNombre: r.nombre, llave: p.llave ?? 0, equipoLocalId: p.equipoLocalId, equipoVisitanteId: p.equipoVisitanteId, estado: p.estado })
        }
      }
      return results
    },
    enabled: rondas.length > 0,
  })

  useEffect(() => {
    if (!divisionId || partidosEliminatoria.length === 0) return

    const uniquePartidos = partidosEliminatoria.filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    )

    const finalizedIds = new Set(uniquePartidos.filter((p) => p.estado === "FINALIZADO").map((p) => p.id))
    let slotsToKeep = slots.filter((s) => {
      if (s.tipo !== 'eliminatoria') return true
      return !(s.partidoId && finalizedIds.has(s.partidoId))
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

    // Collect current eliminatoria participant IDs
    const curElimTeamIds = new Set<string>()
    for (const s of slotsToKeep) {
      if (s.tipo !== 'eliminatoria') continue
      if (s.equipoLocalId) curElimTeamIds.add(s.equipoLocalId)
      if (s.equipoVisitanteId) curElimTeamIds.add(s.equipoVisitanteId)
    }
    for (const p of nuevos) {
      if (p.equipoLocalId) curElimTeamIds.add(p.equipoLocalId)
      if (p.equipoVisitanteId) curElimTeamIds.add(p.equipoVisitanteId)
    }

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
    if (!teamDataChanged && nuevos.length === 0 && slotsToKeep.length === slots.length && !needsNormalization) return

    // Trim regular/auto slots to make room for eliminatorias
    const totalEliminatorias = slotsToKeep.filter((s) => s.tipo === 'eliminatoria').length + nuevos.length
    const baseRegular = Math.floor((habilitados ?? []).length / 2)
    const targetSlotCount = Math.max(0, baseRegular - totalEliminatorias)
    if (playoffMode) {
      const autoAmistosos = slotsToKeep.filter((s) => s.tipo === 'amistoso' && !isSlotManual(s))
      if (autoAmistosos.length > targetSlotCount) {
        const other = slotsToKeep.filter((s) => s.tipo !== 'amistoso' || isSlotManual(s))
        slotsToKeep = [...autoAmistosos.slice(0, targetSlotCount), ...other]
      }
    } else {
      const regs = slotsToKeep.filter((s) => !s.tipo || s.tipo === 'regular')
      if (regs.length > targetSlotCount) {
        const nonReg = slotsToKeep.filter((s) => s.tipo && s.tipo !== 'regular')
        slotsToKeep = [...regs.slice(0, targetSlotCount), ...nonReg]
      }
    }

    const validDays = parseDiasPartido(division?.diasPartido ?? "sab")
    const refDate = slots[0]?.fecha ?? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` })()

    const ocupadosMap = new Map<string, Set<string>>()
    for (const sl of slotsToKeep) {
      if (!ocupadosMap.has(sl.fecha)) ocupadosMap.set(sl.fecha, new Set())
      ocupadosMap.get(sl.fecha)!.add(sl.horaInicio)
    }

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

    const newSlots: TimeSlotConfig[] = []
    const cursor = localDateFromString(refDate)
    for (let d = 0; d < 60 && newSlots.length < nuevos.length; d++) {
      if (validDays.includes(cursor.getDay())) {
        const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
        const ocupados = ocupadosMap.get(fecha) ?? new Set()
        for (const ts of dayTimeSlots) {
          if (newSlots.length >= nuevos.length) break
          if (!ocupados.has(ts.horaInicio)) {
            ocupados.add(ts.horaInicio)
            const p = nuevos[newSlots.length]
            newSlots.push({
              id: `elim-${p.id}`,
              fecha,
              horaInicio: ts.horaInicio,
              horaFin: ts.horaFin,
              tipo: 'eliminatoria',
              partidoId: p.id,
              rondaNombre: p.rondaNombre,
              llave: p.llave,
              equipoLocalId: p.equipoLocalId ?? undefined,
              equipoVisitanteId: p.equipoVisitanteId ?? undefined,
            })
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    // Remove eliminatoria participants from regular/special slots
    const finalSlots = [...slotsToKeep, ...newSlots]
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

    if (newSlots.length > 0 || slotsToKeep.length !== slots.length || teamDataChanged) {
      replaceSlots(divisionId!, cleanedSlots)
      if (schedule?.descansoEquipoId && elimTeamIds.has(schedule.descansoEquipoId)) {
        setDescansoEquipoId(divisionId!, undefined)
      }
    }
  }, [partidosEliminatoria, divisionId, division?.horarioPartido, division?.duracionPartido, division?.descanso, division?.diasPartido, habilitados, slots, replaceSlots, schedule?.descansoEquipoId, setDescansoEquipoId, playoffMode])

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
        qc.invalidateQueries({ queryKey: ["partidos-eliminatoria-todos", divisionId] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, divisionId])

  const handleGenerateSlots = () => {
    if (!division?.horarioPartido || !division?.duracionPartido || !division?.diasPartido) {
      toast.error("La división no tiene horario o días de partido configurados")
      return
    }
    const neededSlots = Math.floor((habilitados ?? []).length / 2)
    const eliminatoriaCount = slots.filter((s) => s.tipo === 'eliminatoria').length
    const regularSlotsNeeded = Math.max(0, neededSlots - eliminatoriaCount)

    // Calculate weekly capacity
    const validDays = parseDiasPartido(division.diasPartido)
    const ranges = parseRanges(division.horarioPartido)
    const slotTotal = (division.duracionPartido ?? 60) + (division.descanso ?? 0)
    let weeklyCapacity = 0
    for (const r of ranges) {
      const s = timeToMinutes(r.start)
      const e = timeToMinutes(r.end)
      if (division.duracionPartido && e > s) {
        weeklyCapacity += Math.floor((e - s) / slotTotal)
      }
    }
    weeklyCapacity *= validDays.length
    if (regularSlotsNeeded > weeklyCapacity) {
      toast.info(`Se necesitan ${regularSlotsNeeded} slots, pero la semana solo tiene capacidad para ${weeklyCapacity}. Agrega más horarios o días de juego.`)
      setGenerating(false)
      return
    }

    setGenerating(true)
    const refDate = lastJornada?.fechaInicio ? computeRefDateFromJornada(lastJornada.fechaInicio) : undefined
    requestAnimationFrame(() => {
      initSchedule(divisionId!, division.diasPartido ?? '', division.horarioPartido ?? '', division.duracionPartido ?? 60, division.descanso ?? 0, refDate, regularSlotsNeeded, habilitados)
      setTimeout(() => setGenerating(false), 250)
    })
  }

  useEffect(() => {
    if (!division || !divisionId || !division.horarioPartido || !division.duracionPartido || !division.diasPartido) {
      return
    }
    if (!habilitados || habilitados.length < 2) {
      return
    }
    if (lastJornada === undefined) return
    // Skip auto-generation if user has manually assigned teams or set descanso
    const hasManualEdits = slots.some(
      (s) => (s.equipoLocalId || s.equipoVisitanteId) && s.tipo !== 'eliminatoria'
    ) || slots.some((s) => s.tipo === 'amistoso' || s.tipo === 'complemento')
      || !!schedule?.descansoEquipoId
    if (hasManualEdits) {
      return
    }
    const frame = requestAnimationFrame(handleGenerateSlots)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId, division?.horarioPartido, division?.duracionPartido, division?.diasPartido, habilitados, lastJornada])

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

      if (moveSlotToDay(divisionId!, sl.id, newFechaStr)) {
        setExpandedDay(newFechaStr)
        return
      }

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
        setExpandedDay(newFechaStr)
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
      {generating ? (
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, paddingVertical: Pad.xl, paddingHorizontal: Pad.base, alignItems: "center", gap: Gap.md, borderWidth: 1, borderColor: Palette.border }}>
          <ActivityIndicator size="large" color={Palette.cyan} />
          <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, textAlign: "center" }}>Actualizando programación...</Text>
        </View>
      ) : slots.length === 0 ? (
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, alignItems: "center", paddingVertical: Pad.xl, paddingHorizontal: Pad.base, gap: Gap.sm, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name="schedule" size={48} color={Palette.textMuted} />
          {habilitados && habilitados.length > 0 ? (
            <>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, textAlign: "center" }}>{habilitados.length} equipos habilitados</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center" }}>Genera {Math.floor(habilitados.length / 2)} slots para la próxima jornada</Text>
            </>
          ) : (
            <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans, textAlign: "center" }}>Selecciona equipos en la pantalla de la división</Text>
          )}
        </View>
      ) : (
        <View style={{ gap: Gap.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Pad.sm }}>
            <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.text }}>Slots ({slots.length})</Text>
            <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.textMuted }}>{(habilitados ?? []).length} equipos</Text>
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
                const daySlots = visibleSlots.filter((s) => s.fecha === fecha)
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
                        {daySlots.length > 0 ? daySlots.map((sl) => (
                          <TimeSlotCard
                            key={sl.tipo === "eliminatoria" ? `partido-${sl.partidoId}` : `slot-${sl.id}`}
                            slot={sl}
                            localNombre={allTeams.find((t) => t.id === sl.equipoLocalId)?.nombre}
                            visitanteNombre={allTeams.find((t) => t.id === sl.equipoVisitanteId)?.nombre}
                            canchaNombre={canchas.find((c: any) => c.id === sl.canchaId)?.nombre}
                            showSwapIcon={validDays.length > 1}
                            showCanchaPicker={showCanchaPicker}
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

          {!playoffMode && habilitados && habilitados.length % 2 !== 0 && !hasExtraSlots ? (
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

          {!playoffMode && habilitados && habilitados.length % 2 !== 0 && !hasExtraSlots ? (
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans, marginTop: Gap.sm }}>O puedes agregar un partido amistoso o completar para que ese equipo no se quede sin jugar</Text>
          ) : null}
          {showCanchaPicker && slots.length > 0 ? (
            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              {canchas.filter((c: any) => c.activa !== false).map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setAllSlotsCancha(divisionId!, c.id)}
                  activeOpacity={0.7}
                  style={{ flex: 1, backgroundColor: Palette.warning10, borderRadius: Radius.md, padding: Pad.sm, alignItems: "center", gap: Gap.micro }}
                >
                  <MaterialIcons name="place" size={14} color={Palette.warning} />
                  <Text style={{ color: Palette.warning, fontSize: 11, fontFamily: Fonts.sans }}>{c.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: Gap.sm }}>
            {!playoffMode ? (
              <TouchableOpacity
                onPress={() => {
                  if (atRegularLimit) {
                    toast.info("Ya tienes los slots regulares necesarios para los equipos habilitados")
                    return
                  }
                  addSlot(divisionId!, 'regular')
                }}
                activeOpacity={0.7}
                style={{ flex: 1, backgroundColor: atRegularLimit ? Palette.dark60 : Palette.cyan, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm, opacity: atRegularLimit ? 0.5 : 1 }}
              >
                <MaterialIcons name="sports" size={18} color={atRegularLimit ? Palette.textMuted : Palette.black} />
                <Text style={{ color: atRegularLimit ? Palette.textMuted : Palette.black, fontSize: 13, fontFamily: Fonts.semiBold }}>Regular</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => addSlot(divisionId!, 'amistoso')}
              activeOpacity={0.7}
              style={{ flex: 1, backgroundColor: Palette.warning, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm }}
            >
              <MaterialIcons name="sports-kabaddi" size={18} color={Palette.dark} />
              <Text style={{ color: Palette.dark, fontSize: 13, fontFamily: Fonts.semiBold }}>Amistoso</Text>
            </TouchableOpacity>
            {!playoffMode ? (
              <TouchableOpacity
                onPress={() => addSlot(divisionId!, 'complemento')}
                activeOpacity={0.7}
                style={{ flex: 1, backgroundColor: Palette.danger, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm }}
              >
                <MaterialIcons name="group-add" size={18} color={Palette.text} />
                <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>Completar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      <View style={{ gap: Gap.sm, paddingTop: Gap.md, borderTopWidth: 1, borderTopColor: Palette.border }}>
        {(habilitados ?? []).length < 2 ? (
          <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center", paddingVertical: Pad.sm }}>
            Selecciona al menos 2 equipos para generar la jornada
          </Text>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              const oddWithoutDescanso = !playoffMode && habilitados && habilitados.length % 2 !== 0 && !hasExtraSlots && !schedule?.descansoEquipoId
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
              const incompleteAmistoso = slots.find((s) => s.tipo === 'amistoso' && (!s.equipoLocalId || !s.equipoVisitanteId))
              if (incompleteAmistoso) {
                toast.error("Asigna ambos equipos al partido amistoso antes de generar la jornada")
                return
              }
              const incompleteComplemento = slots.find((s) => s.tipo === 'complemento' && !s.equipoLocalId)
              if (incompleteComplemento) {
                toast.error("Asigna el equipo que obtiene puntos antes de generar la jornada")
                return
              }
              if (showCanchaPicker && activeSlots.some((slot) => !slot.canchaId)) {
                toast.error("Asigna una cancha a todos los partidos antes de generar la jornada")
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
        )}
      </View>
    </View>
  )

  const modals = (
    <>
      <TeamPickerModal
        visible={!!pickingSlot}
        pickingSlot={pickingSlot}
        slots={slots}
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
        visible={canchaPickerSlotId !== null}
        onClose={() => setCanchaPickerSlotId(null)}
        title="Seleccionar cancha"
        snapPoints={["50%"]}
      >
        <ScrollView>
          {canchaPickerSlotId && (
            <TouchableOpacity
              onPress={() => { setSlotCancha(divisionId!, canchaPickerSlotId, undefined); setCanchaPickerSlotId(null) }}
              style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", marginBottom: Gap.sm }}
            >
              <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>Sin cancha</Text>
            </TouchableOpacity>
          )}
          {canchas.filter((c: any) => c.activa !== false).map((c: any) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => { setSlotCancha(divisionId!, canchaPickerSlotId!, c.id); setCanchaPickerSlotId(null) }}
              style={{
                backgroundColor: Palette.surfaceLight,
                borderRadius: Radius.md,
                padding: Pad.md,
                marginBottom: Gap.sm,
                borderWidth: 1,
                borderColor: slots.find((s) => s.id === canchaPickerSlotId)?.canchaId === c.id ? Palette.cyan : Palette.border,
              }}
            >
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>{c.nombre}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setCanchaPickerSlotId(null)} style={{ paddingVertical: Pad.md, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>Cancelar</Text>
          </TouchableOpacity>
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
