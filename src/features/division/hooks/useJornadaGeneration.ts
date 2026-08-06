import { useCallback, useRef, useState } from "react"
import { useGenerateNextJornada } from "@/features/jornada/hooks/useJornadas"
import { getActiveSlots, useDivisionScheduleStore } from "@/stores/divisionSchedule"
import { prepareJornadaSlots } from "@/features/division/utils/prepareJornadaSlots"
import { useToast } from "@/shared/components/Toast"
import { divisionApi } from "@/features/division/api/divisions"
import { courtAvailabilityApi } from "@/features/court-availability/api/courtAvailability"
import { planFromAvailability } from "@/features/court-availability/planner"

interface UseJornadaGenerationOptions {
  divisionId: string
  ligaCompletada: boolean
  playoffMode: boolean
  onGenerated: () => void
}

export function useJornadaGeneration({
  divisionId,
  ligaCompletada,
  playoffMode,
  onGenerated,
}: UseJornadaGenerationOptions) {
  const toast = useToast()
  const generateNext = useGenerateNextJornada()
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const generationAttemptRef = useRef<{ fingerprint: string; key: string } | null>(null)

  const schedule = useDivisionScheduleStore((s) => (divisionId ? s.schedules[divisionId] : undefined))
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const guardarProgramacion = useDivisionScheduleStore((s) => s.guardarProgramacion)
  const advanceSchedule = useDivisionScheduleStore((s) => s.advanceSchedule)
  const clearExtraSlots = useDivisionScheduleStore((s) => s.clearExtraSlots)
  const clearEliminatoriaSlots = useDivisionScheduleStore((s) => s.clearEliminatoriaSlots)
  const replaceSlots = useDivisionScheduleStore((s) => s.replaceSlots)
  const setHabilitadosStore = useDivisionScheduleStore((s) => s.setHabilitados)

  const handleGenerateJornada = useCallback(async () => {
    if (ligaCompletada) {
      toast.info("Temporada completada. Reinicia la división para continuar.")
      return
    }
    if (!schedule) {
      toast.error("Primero configura la programación de la jornada")
      return
    }
    if (!habilitados || habilitados.length < 2) {
      toast.error("Marca al menos 2 equipos que pagaron arbitraje para generar una jornada")
      return
    }

    const oddCount = habilitados.length % 2 !== 0
    const hasComplementoSlot = schedule.slots.some((slot) => slot.tipo === "complemento")
    if (!playoffMode && oddCount && !hasComplementoSlot && !schedule.descansoEquipoId) {
      toast.error("Selecciona qué equipo descansa antes de generar la jornada")
      return
    }

    setCheckingAvailability(true)
    let plannedSlots = schedule.slots
    try {
      const division = await divisionApi.getById(divisionId)
      const authoritativeSlots = division.canchaUnicaId
        ? schedule.slots.map((slot) => ({ ...slot, canchaId: division.canchaUnicaId! }))
        : schedule.canchaUnicaIdSnapshot
          ? schedule.slots.map((slot) => ({ ...slot, canchaId: undefined }))
          : schedule.slots
      const activeSlots = getActiveSlots(authoritativeSlots, habilitados.length, playoffMode)
      const starts = activeSlots.map((slot) => new Date(`${slot.fecha}T${slot.horaInicio}:00`).getTime()).filter(Number.isFinite)
      const ends = activeSlots.map((slot) => {
        const start = new Date(`${slot.fecha}T${slot.horaInicio}:00`).getTime()
        let end = new Date(`${slot.fecha}T${slot.horaFin}:00`).getTime()
        if (end <= start) end += 86_400_000
        return end
      }).filter(Number.isFinite)
      if (starts.length === 0 || ends.length === 0) throw new Error("Los horarios de la jornada no son válidos")
      const availability = await courtAvailabilityApi.get(
        division.ligaId,
        new Date(Math.min(...starts)).toISOString(),
        new Date(Math.max(...ends)).toISOString(),
      )
      if (availability.mode === "MULTIPLE" && availability.canchas.length < 2) {
        throw new Error("La liga usa múltiples canchas, pero necesita al menos 2 canchas activas")
      }
      if (division.canchaUnicaId && !availability.canchas.some((cancha) => cancha.id === division.canchaUnicaId)) {
        throw new Error("La cancha fija de la división no está activa")
      }
      const plan = planFromAvailability(activeSlots, availability)
      if (plan.conflicts.length > 0 || plan.unassignedSlotIds.length > 0) {
        throw new Error("Hay conflictos de cancha. Corrígelos antes de generar la jornada")
      }
      const plannedById = new Map(plan.slots.map((slot) => [slot.id, slot]))
      plannedSlots = authoritativeSlots.map((slot) => plannedById.get(slot.id) ?? slot)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar la disponibilidad de canchas")
      setCheckingAvailability(false)
      return
    }

    const slotsParaJornada = prepareJornadaSlots(plannedSlots, habilitados, playoffMode)
    const fingerprint = JSON.stringify({ slots: slotsParaJornada, equipoIds: [...habilitados].sort(), descansoEquipoId: schedule.descansoEquipoId ?? null })
    if (generationAttemptRef.current?.fingerprint !== fingerprint) {
      generationAttemptRef.current = {
        fingerprint,
        key: `jornada-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
      }
    }
    replaceSlots(divisionId, plannedSlots)
    setCheckingAvailability(false)

    generateNext.mutate(
      {
        divisionId,
        slots: slotsParaJornada,
        equipoIds: habilitados,
        descansoEquipoId: schedule.descansoEquipoId,
        idempotencyKey: generationAttemptRef.current.key,
      },
      {
        onSuccess: (jornadaCreada) => {
          generationAttemptRef.current = null
          guardarProgramacion(divisionId)
          clearExtraSlots(divisionId)
          clearEliminatoriaSlots(divisionId)
          const jornadaFecha = jornadaCreada.fechaInicio ?? (() => {
            const fechas = slotsParaJornada.map((slot) => slot.fecha).filter(Boolean) as string[]
            return fechas.length > 0 ? [...fechas].sort()[0] : undefined
          })()
          advanceSchedule(divisionId, jornadaFecha)
          setHabilitadosStore(divisionId, [])
          onGenerated()
          toast.success("Jornada generada")
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [
    divisionId,
    ligaCompletada,
    schedule,
    habilitados,
    playoffMode,
    generateNext,
    guardarProgramacion,
    advanceSchedule,
    clearExtraSlots,
    clearEliminatoriaSlots,
    replaceSlots,
    setHabilitadosStore,
    onGenerated,
    toast,
  ])

  return {
    handleGenerateJornada,
    isGeneratingJornada: generateNext.isPending || checkingAvailability,
  }
}
