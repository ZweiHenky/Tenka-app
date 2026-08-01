import { getActiveSlots } from "@/stores/divisionSchedule"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"

export function prepareJornadaSlots(
  slots: TimeSlotConfig[],
  habilitados: string[],
  playoffMode: boolean,
): TimeSlotConfig[] {
  const habSet = new Set(habilitados)
  const activeSlots = getActiveSlots(slots, habilitados.length, playoffMode)

  const eliminatoriaTeamIds = new Set<string>()
  for (const slot of slots) {
    if (slot.tipo !== "eliminatoria") continue
    if (slot.equipoLocalId) eliminatoriaTeamIds.add(slot.equipoLocalId)
    if (slot.equipoVisitanteId) eliminatoriaTeamIds.add(slot.equipoVisitanteId)
  }

  return activeSlots.map((slot) => ({
    ...slot,
    equipoLocalId:
      slot.tipo === "eliminatoria"
        ? slot.equipoLocalId
        : slot.tipo === "amistoso"
          ? slot.equipoLocalId && habSet.has(slot.equipoLocalId)
            ? slot.equipoLocalId
            : undefined
          : slot.equipoLocalId && habSet.has(slot.equipoLocalId) && !eliminatoriaTeamIds.has(slot.equipoLocalId)
            ? slot.equipoLocalId
            : undefined,
    equipoVisitanteId:
      slot.tipo === "eliminatoria"
        ? slot.equipoVisitanteId
        : slot.tipo === "amistoso"
          ? slot.equipoVisitanteId && habSet.has(slot.equipoVisitanteId)
            ? slot.equipoVisitanteId
            : undefined
          : slot.equipoVisitanteId && habSet.has(slot.equipoVisitanteId) && !eliminatoriaTeamIds.has(slot.equipoVisitanteId)
            ? slot.equipoVisitanteId
            : undefined,
  }))
}
