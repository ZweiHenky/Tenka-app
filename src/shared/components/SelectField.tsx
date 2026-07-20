import { useState } from "react"
import { View, Text, TouchableOpacity, FlatList } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import AppBottomSheetModal from "./AppBottomSheetModal"

interface Option {
  id: string
  nombre: string
}

interface SelectFieldProps {
  label: string
  current: string
  options: Option[]
  onSelect: (value: string) => void
}

export function SelectField({ label, current, options, onSelect }: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const selected = options.find((o) => o.id === current)

  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary, marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: selected ? Palette.borderActive : Palette.border, padding: Pad.base, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <Text style={{ color: selected ? Palette.text : Palette.textMuted, fontSize: 15 }}>
          {selected?.nombre ?? "Seleccionar..."}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={20} color={Palette.cyan} />
      </TouchableOpacity>

      <AppBottomSheetModal visible={open} onClose={() => setOpen(false)} title={label} snapPoints={["60%"]} scrollable={false} stackBehavior="push">
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 32) }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Palette.border }} />}
              renderItem={({ item }) => {
                const active = item.id === current
                return (
                  <TouchableOpacity
                    onPress={() => { onSelect(item.id); setOpen(false) }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: Pad.md, paddingHorizontal: Pad.base, borderRadius: Radius.md, backgroundColor: active ? Palette.cyan10 : "transparent" }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: active ? "700" : "400", color: active ? Palette.cyan : Palette.text }}>{item.nombre}</Text>
                    {active ? <MaterialIcons name="check" size={20} color={Palette.cyan} /> : null}
                  </TouchableOpacity>
                )
              }}
            />
      </AppBottomSheetModal>
    </View>
  )
}
