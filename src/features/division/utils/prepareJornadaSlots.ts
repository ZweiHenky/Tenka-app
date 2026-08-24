import { equiposDisponiblesParaRegulares } from "@/features/division/utils/descanso"
import { getActiveSlots } from "@/stores/divisionSchedule"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import type { SlotInput } from "@/features/jornada/api/jornadas"

export function prepareJornadaSlots(
  slots: TimeSlotConfig[],
  habilitados: string[],
  playoffMode: boolean,
  courtOrder: string[] = [],
): SlotInput[] {
  const habSet = new Set(habilitados)
  const activeSlots = getActiveSlots(slots, equiposDisponiblesParaRegulares(habilitados, slots), playoffMode, courtOrder)

  const eliminatoriaTeamIds = new Set<string>()
  for (const slot of slots) {
    if (slot.tipo !== "eliminatoria") continue
    if (slot.equipoLocalId) eliminatoriaTeamIds.add(slot.equipoLocalId)
    if (slot.equipoVisitanteId) eliminatoriaTeamIds.add(slot.equipoVisitanteId)
  }

  return activeSlots.map((slot) => {
    const tipo = playoffMode && slot.tipo !== "eliminatoria" ? "amistoso" : slot.tipo
    const equipoLocalId =
      tipo === "eliminatoria"
        ? slot.equipoLocalId
        : slot.tipo === "amistoso"
          ? slot.equipoLocalId && habSet.has(slot.equipoLocalId)
            ? slot.equipoLocalId
            : undefined
          : slot.equipoLocalId && habSet.has(slot.equipoLocalId) && !eliminatoriaTeamIds.has(slot.equipoLocalId)
            ? slot.equipoLocalId
            : undefined
    const equipoVisitanteId =
      tipo === "eliminatoria"
        ? slot.equipoVisitanteId
        : slot.tipo === "amistoso"
          ? slot.equipoVisitanteId && habSet.has(slot.equipoVisitanteId)
            ? slot.equipoVisitanteId
            : undefined
          : slot.equipoVisitanteId && habSet.has(slot.equipoVisitanteId) && !eliminatoriaTeamIds.has(slot.equipoVisitanteId)
            ? slot.equipoVisitanteId
            : undefined

    return {
      fecha: slot.fecha,
      horaInicio: slot.horaInicio,
      horaFin: slot.horaFin,
      equipoLocalId,
      equipoVisitanteId,
      tipo,
      canchaId: slot.canchaId,
      partidoId: slot.partidoId,
    }
  })
}
