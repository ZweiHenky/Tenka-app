import { useCallback } from "react"
import { useGenerateNextJornada } from "@/features/jornada/hooks/useJornadas"
import { useDivisionScheduleStore } from "@/stores/divisionSchedule"
import { prepareJornadaSlots } from "@/features/division/utils/prepareJornadaSlots"
import { useToast } from "@/shared/components/Toast"

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

  const schedule = useDivisionScheduleStore((s) => (divisionId ? s.schedules[divisionId] : undefined))
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const guardarProgramacion = useDivisionScheduleStore((s) => s.guardarProgramacion)
  const advanceSchedule = useDivisionScheduleStore((s) => s.advanceSchedule)
  const clearExtraSlots = useDivisionScheduleStore((s) => s.clearExtraSlots)
  const clearEliminatoriaSlots = useDivisionScheduleStore((s) => s.clearEliminatoriaSlots)
  const setHabilitadosStore = useDivisionScheduleStore((s) => s.setHabilitados)

  const handleGenerateJornada = useCallback(() => {
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

    const slotsParaJornada = prepareJornadaSlots(
      schedule.slots,
      habilitados,
      playoffMode,
    )

    generateNext.mutate(
      {
        divisionId,
        slots: slotsParaJornada,
        equipoIds: habilitados,
        descansoEquipoId: schedule.descansoEquipoId,
      },
      {
        onSuccess: (jornadaCreada) => {
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
    setHabilitadosStore,
    onGenerated,
    toast,
  ])

  return {
    handleGenerateJornada,
    isGeneratingJornada: generateNext.isPending,
  }
}
