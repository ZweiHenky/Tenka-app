import { Text, ScrollView, TouchableOpacity } from "react-native"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { isTimeOccupied } from "@/features/division/utils/time-occupancy"

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
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

function generateTimeOptions(
  horarioPartido: string,
  duracion: number,
  descanso: number,
): { horaInicio: string; horaFin: string }[] {
  const ranges = parseRanges(horarioPartido)
  if (ranges.length === 0) return []
  const slotTotal = duracion + descanso
  const options: { horaInicio: string; horaFin: string }[] = []
  for (const range of ranges) {
    const inicioMin = timeToMinutes(range.start)
    const finMin = timeToMinutes(range.end)
    let current = inicioMin
    while (current + duracion <= finMin) {
      options.push({
        horaInicio: minutesToTime(current),
        horaFin: minutesToTime(current + duracion),
      })
      current += slotTotal
    }
  }
  return options
}

interface Props {
  visible: boolean
  currentSlotId: string
  currentCanchaId?: string
  fecha: string
  horarioPartido: string
  duracionPartido: number
  descanso: number
  slots: TimeSlotConfig[]
  onSelectTime: (horaInicio: string, horaFin: string) => void
  onClose: () => void
}

export default function TimePickerModal({
  visible,
  currentSlotId,
  currentCanchaId,
  fecha,
  horarioPartido,
  duracionPartido,
  descanso,
  slots,
  onSelectTime,
  onClose,
}: Props) {
  const options = generateTimeOptions(horarioPartido, duracionPartido, descanso)

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title="Elegir horario" snapPoints={["70%"]}>
          <ScrollView>
            {options.map((opt) => {
              const taken = isTimeOccupied(opt, currentSlotId, slots, fecha, currentCanchaId)
              return (
                <TouchableOpacity
                  key={opt.horaInicio}
                  onPress={() => {
                    onSelectTime(opt.horaInicio, opt.horaFin)
                    onClose()
                  }}
                  style={{
                    backgroundColor: taken ? Palette.danger : Palette.surfaceLight,
                    borderRadius: Radius.md,
                    padding: Pad.md,
                    marginBottom: Gap.sm,
                    opacity: taken ? 0.7 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: Palette.text,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {opt.horaInicio} - {opt.horaFin}
                    {taken ? " (ocupado - se intercambiará)" : ""}
                  </Text>
                </TouchableOpacity>
              )
            })}
            <TouchableOpacity onPress={onClose} style={{ paddingVertical: Pad.md, alignItems: "center" }}>
              <Text style={{ color: Palette.textMuted, fontWeight: "600", fontSize: 14 }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </ScrollView>
    </AppBottomSheetModal>
  )
}
