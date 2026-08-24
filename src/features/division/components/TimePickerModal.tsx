import { Text, TouchableOpacity, View } from "react-native"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { isTimeOccupied } from "@/shared/utils/time-occupancy"
import { generateTimeSlots } from "@/shared/utils/time-range"

function generateTimeOptions(
  horarioPartido: string,
  duracion: number,
  descanso: number,
): { horaInicio: string; horaFin: string }[] {
  return generateTimeSlots(horarioPartido, duracion, descanso)
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
          {/* Sin ScrollView propio: la hoja ya trae el suyo y anidarlos rompe el gesto. */}
          <View>
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
          </View>
    </AppBottomSheetModal>
  )
}
