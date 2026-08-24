import { useState } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Palette } from "@/constants/theme"
import AppBottomSheetModal from "./AppBottomSheetModal"

interface Option {
  id: string
  nombre: string
  disabled?: boolean
  description?: string
}

interface SelectFieldProps {
  label: string
  current: string
  options: Option[]
  onSelect: (value: string) => void
  /** Muestra el valor sin permitir cambiarlo. `hint` explica por qué. */
  readOnly?: boolean
  hint?: string
}

export function SelectField({ label, current, options, onSelect, readOnly, hint }: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.id === current)

  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary, marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        disabled={readOnly}
        accessibilityState={{ disabled: !!readOnly }}
        style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: selected ? Palette.borderActive : Palette.border, padding: Pad.base, flexDirection: "row", justifyContent: "space-between", alignItems: "center", opacity: readOnly ? 0.6 : 1 }}
      >
        <Text style={{ color: selected ? Palette.text : Palette.textMuted, fontSize: 15 }}>
          {selected?.nombre ?? "Seleccionar..."}
        </Text>
        <MaterialIcons name={readOnly ? "lock-outline" : "arrow-drop-down"} size={20} color={readOnly ? Palette.textMuted : Palette.cyan} />
      </TouchableOpacity>
      {hint ? (
        <Text style={{ color: Palette.textMuted, fontSize: 11, marginTop: 4 }}>{hint}</Text>
      ) : null}

      <AppBottomSheetModal visible={open} onClose={() => setOpen(false)} title={label} snapPoints={["60%"]} stackBehavior="push">
        {/* Sin lista virtualizada: estos selects son catálogos de 2 a 15 opciones. La lista
            obligaba a acotarle la altura para darle viewport, y ese tope era justamente lo que
            dejaba categorías fuera de alcance. Acá scrollea la hoja. */}
        <View>
          {options.map((item, index) => {
            const active = item.id === current
            return (
              <View key={item.id}>
                {index > 0 ? <View style={{ height: 1, backgroundColor: Palette.border }} /> : null}
                <TouchableOpacity
                  disabled={item.disabled}
                  onPress={() => { onSelect(item.id); setOpen(false) }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: Pad.md, paddingHorizontal: Pad.base, borderRadius: Radius.md, backgroundColor: active ? Palette.cyan10 : "transparent", opacity: item.disabled ? 0.5 : 1 }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: active ? "700" : "400", color: active ? Palette.cyan : Palette.text }}>{item.nombre}</Text>
                    {item.description ? <Text style={{ fontSize: 12, color: Palette.textMuted }}>{item.description}</Text> : null}
                  </View>
                  {active ? <MaterialIcons name="check" size={20} color={Palette.cyan} /> : null}
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      </AppBottomSheetModal>
    </View>
  )
}
