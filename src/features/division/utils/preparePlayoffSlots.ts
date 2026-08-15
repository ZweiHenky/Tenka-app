import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import { generateTimeSlots } from "@/shared/utils/time-range"

type DivisionConfig = {
  diasPartido: string | null
  horarioPartido: string | null
  duracionPartido: number | null
  descanso: number | null
}

type Eliminado = {
  id: string
  nombre: string
  llave: number
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function preparePlayoffSlots(
  existingSlots: TimeSlotConfig[],
  division: DivisionConfig,
  eliminados: Eliminado[],
): TimeSlotConfig[] {
  const validDays = parseDiasPartido(division.diasPartido ?? "sab")
  const duracion = division.duracionPartido ?? 60
  const dayTimeSlots = generateTimeSlots(division.horarioPartido ?? "08:00-20:00", duracion, division.descanso ?? 0)

  const ocupadosMap = new Map<string, Set<string>>()
  for (const sl of existingSlots) {
    if (!ocupadosMap.has(sl.fecha)) ocupadosMap.set(sl.fecha, new Set())
    ocupadosMap.get(sl.fecha)!.add(sl.horaInicio)
  }

  const refDate = existingSlots[0]?.fecha ?? formatDateLocal(new Date())
  const refParts = refDate.split("-").map(Number)
  const cursor = new Date(refParts[0], refParts[1] - 1, refParts[2])
  const newSlots: TimeSlotConfig[] = []

  for (let d = 0; d < 60 && newSlots.length < eliminados.length; d++) {
    if (validDays.includes(cursor.getDay())) {
      const fecha = formatDateLocal(cursor)
      const ocupados = ocupadosMap.get(fecha) ?? new Set()
      for (const ts of dayTimeSlots) {
        if (newSlots.length >= eliminados.length) break
        if (!ocupados.has(ts.horaInicio)) {
          ocupados.add(ts.horaInicio)
            const e = eliminados[newSlots.length]
                  newSlots.push({
                    id: `slot-${existingSlots.length + newSlots.length}-elim`,
                    fecha,
                    horaInicio: ts.horaInicio,
                    horaFin: ts.horaFin,
                    tipo: "eliminatoria",
                    partidoId: e.id,
                    rondaNombre: e.nombre,
                    llave: e.llave,
                  })
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return newSlots
}
