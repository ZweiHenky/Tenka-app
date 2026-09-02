import { equiposDisponiblesParaRegulares, exigeEquipoQueDescansa } from "@/features/division/utils/descanso"
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
  leagueId: string
  ligaCompletada: boolean
  playoffMode: boolean
  /**
   * Con `false` la división es de puro cuadro: los equipos que juegan los decide el bracket, no
   * la selección semanal de `habilitados`, que es un concepto de liga.
   */
  faseLiga: boolean
  onGenerated: () => void
}

export function useJornadaGeneration({
  divisionId,
  leagueId,
  ligaCompletada,
  playoffMode,
  faseLiga,
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
    if (faseLiga && (!habilitados || habilitados.length < 2)) {
      toast.error("Marca al menos 2 equipos que pagaron arbitraje para generar una jornada")
      return
    }
    // En un cuadro no hay equipos habilitados que exigir; lo que hace falta es tener partidos
    // programados, que es lo que va a llevar la jornada.
    if (!faseLiga && schedule.slots.length === 0) {
      toast.error("Programa al menos un partido del cuadro antes de generar la jornada")
      return
    }

    const complementoSlots = schedule.slots.filter((slot) => slot.tipo === "complemento")
    const incompleteComplemento = complementoSlots.find((slot) => !slot.equipoLocalId || !slot.equipoVisitanteId)
    if (incompleteComplemento) {
      if (!incompleteComplemento.equipoLocalId && !incompleteComplemento.equipoVisitanteId) toast.error("Asigna ambos equipos del partido de complemento antes de generar la jornada")
      else if (!incompleteComplemento.equipoLocalId) toast.error("Asigna el equipo que gana puntos en el partido de complemento")
      else toast.error("Asigna el equipo que repetirá partido sin puntos en el complemento")
      return
    }
    const descansoObligatorio = faseLiga && !playoffMode
      && exigeEquipoQueDescansa(habilitados, schedule.slots)
    if (descansoObligatorio && !schedule.descansoEquipoId) {
      toast.error("Selecciona qué equipo descansa antes de generar la jornada")
      return
    }

    setCheckingAvailability(true)
    let plannedSlots = schedule.slots
    let courtOrder: string[] = []
    try {
      const division = await divisionApi.getById(divisionId)
      const authoritativeSlots = schedule.slots
      // The window is derived from every slot (a superset of the active ones) so that the court
      // order is known before trimming — the trim needs it to drop the last slot of the last court.
      const starts = authoritativeSlots.map((slot) => new Date(`${slot.fecha}T${slot.horaInicio}:00`).getTime()).filter(Number.isFinite)
      const ends = authoritativeSlots.map((slot) => {
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
      courtOrder = availability.canchas.map((cancha) => cancha.id)
      const activeSlots = getActiveSlots(authoritativeSlots, equiposDisponiblesParaRegulares(habilitados ?? [], authoritativeSlots), playoffMode, courtOrder)
      if (activeSlots.length === 0) throw new Error("Los horarios de la jornada no son válidos")
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

    const slotsParaJornada = prepareJornadaSlots(plannedSlots, habilitados ?? [], playoffMode, courtOrder)
    const descansoEquipoId = descansoObligatorio ? schedule.descansoEquipoId : undefined
    // Omitirlo significa "todos los equipos de la división", que es lo correcto en un cuadro.
    // Mandar `[]` lo rechazaría el backend, que valida `min(2)` cuando el campo viene.
    const equipoIds = faseLiga ? habilitados : undefined
    const fingerprint = JSON.stringify({ slots: slotsParaJornada, equipoIds: equipoIds ? [...equipoIds].sort() : null, descansoEquipoId: descansoEquipoId ?? null })
    if (generationAttemptRef.current?.fingerprint !== fingerprint) {
      generationAttemptRef.current = {
        fingerprint,
        key: `jornada-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
      }
    }
    replaceSlots(divisionId, plannedSlots)
    setCheckingAvailability(false)

    try {
      const jornadaCreada = await generateNext.mutateAsync({
        divisionId,
        leagueId,
        slots: slotsParaJornada,
        equipoIds,
        descansoEquipoId,
        idempotencyKey: generationAttemptRef.current.key,
      })
      generationAttemptRef.current = null
      guardarProgramacion(divisionId)
      clearExtraSlots(divisionId)
      clearEliminatoriaSlots(divisionId, slotsParaJornada
        .filter((slot) => slot.tipo === "eliminatoria" && slot.partidoId)
        .map((slot) => slot.partidoId!))
      const jornadaFecha = jornadaCreada.fechaInicio ?? (() => {
        const fechas = slotsParaJornada.map((slot) => slot.fecha).filter(Boolean) as string[]
        return fechas.length > 0 ? [...fechas].sort()[0] : undefined
      })()
      advanceSchedule(divisionId, jornadaFecha, { faseLiga })
      setHabilitadosStore(divisionId, [])
      onGenerated()
      toast.success("Jornada generada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la jornada")
    }
  }, [
    divisionId,
    leagueId,
    ligaCompletada,
    schedule,
    habilitados,
    playoffMode,
    faseLiga,
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
