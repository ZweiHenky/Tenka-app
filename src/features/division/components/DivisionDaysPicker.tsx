import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { SelectField } from "@/shared/components/SelectField"
import {
  DIVISION_DAY_OPTIONS,
  getDivisionDaysMode,
  getSelectedDivisionDays,
  toggleDivisionDay,
  type DivisionDaysMode,
} from "@/features/division/utils/divisionDays"

const MODE_OPTIONS = [
  { id: "weekdays", nombre: "Lunes a viernes" },
  { id: "weekend", nombre: "Sábado y domingo" },
  { id: "custom", nombre: "Personalizado" },
]

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function DivisionDaysPicker({ value, onChange }: Props) {
  const [mode, setMode] = useState<DivisionDaysMode>(() => getDivisionDaysMode(value))
  const selectedDays = new Set(getSelectedDivisionDays(value))

  const handleModeChange = (nextMode: string) => {
    const next = nextMode as DivisionDaysMode
    setMode(next)
    if (next === "weekdays") onChange("L-V")
    else if (next === "weekend") onChange("S-D")
    else onChange("")
  }

  return (
    <View style={{ gap: Gap.sm }}>
      <SelectField
        label="Días de partido *"
        current={mode}
        options={MODE_OPTIONS}
        onSelect={handleModeChange}
      />

      {mode === "custom" ? (
        <View style={{ gap: Gap.sm }}>
          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>
            Selecciona los días de juego. Puedes omitir cualquier día.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
            {DIVISION_DAY_OPTIONS.map(({ day, label }) => {
              const selected = selectedDays.has(day)
              return (
                <TouchableOpacity
                  key={day}
                  activeOpacity={0.7}
                  onPress={() => onChange(toggleDivisionDay(value, day))}
                  style={{
                    minWidth: "30%",
                    flexGrow: 1,
                    backgroundColor: selected ? Palette.cyan : Palette.surfaceLight,
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    borderColor: selected ? Palette.cyan : Palette.border,
                    paddingHorizontal: Pad.md,
                    paddingVertical: Pad.sm,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: selected ? Palette.black : Palette.textSecondary, fontFamily: Fonts.semiBold, fontSize: 13 }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      ) : null}
    </View>
  )
}
