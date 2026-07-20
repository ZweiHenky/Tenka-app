import { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import AppBottomSheetModal from "./AppBottomSheetModal"

interface Props {
  value: string
  onChange: (val: string) => void
}

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const YEARS = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i)

export function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [tempDay, setTempDay] = useState(1)
  const [tempMonth, setTempMonth] = useState(0)
  const [tempYear, setTempYear] = useState(new Date().getFullYear())

  const parts = value ? value.split("-") : []
  const label = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "Seleccionar fecha"

  const openPicker = () => {
    if (parts.length === 3) {
      setTempYear(Number(parts[0]))
      setTempMonth(Number(parts[1]) - 1)
      setTempDay(Number(parts[2]))
    } else {
      const now = new Date()
      setTempDay(now.getDate())
      setTempMonth(now.getMonth())
      setTempYear(now.getFullYear())
    }
    setOpen(true)
  }

  const confirm = () => {
    const m = String(tempMonth + 1).padStart(2, "0")
    const d = String(tempDay).padStart(2, "0")
    onChange(`${tempYear}-${m}-${d}`)
    setOpen(false)
  }

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: value ? Palette.borderActive : Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, gap: Gap.sm }}
      >
        <MaterialIcons name="calendar-today" size={20} color={Palette.cyan} />
        <Text style={{ flex: 1, fontSize: 15, color: value ? Palette.text : Palette.textMuted }}>{label}</Text>
        <MaterialIcons name="edit" size={18} color={Palette.textSecondary} />
      </TouchableOpacity>

      <AppBottomSheetModal visible={open} onClose={() => setOpen(false)} title="Seleccionar fecha" snapPoints={["55%"]}>

            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <View style={{ flex: 1, gap: Gap.sm }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary, textAlign: "center" }}>Día</Text>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setTempDay(d)}
                      style={{ paddingVertical: Pad.sm, paddingHorizontal: Pad.md, borderRadius: Radius.md, backgroundColor: tempDay === d ? Palette.cyan : "transparent" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: tempDay === d ? Palette.black : Palette.text, textAlign: "center" }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={{ flex: 1, gap: Gap.sm }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary, textAlign: "center" }}>Mes</Text>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setTempMonth(i)}
                      style={{ paddingVertical: Pad.sm, paddingHorizontal: Pad.md, borderRadius: Radius.md, backgroundColor: tempMonth === i ? Palette.cyan : "transparent" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: tempMonth === i ? Palette.black : Palette.text, textAlign: "center" }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={{ flex: 1, gap: Gap.sm }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary, textAlign: "center" }}>Año</Text>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setTempYear(y)}
                      style={{ paddingVertical: Pad.sm, paddingHorizontal: Pad.md, borderRadius: Radius.md, backgroundColor: tempYear === y ? Palette.cyan : "transparent" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: tempYear === y ? Palette.black : Palette.text, textAlign: "center" }}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ flex: 1, paddingVertical: Pad.sm, borderRadius: Radius.md, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: Palette.danger }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={{ flex: 1, paddingVertical: Pad.sm, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: Palette.black }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
      </AppBottomSheetModal>
    </>
  )
}

export function DateRangePicker({ startValue, endValue, onStartChange, onEndChange }: {
  startValue: string
  endValue: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
}) {
  return (
    <View style={{ gap: Gap.sm }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary }}>Fecha de inicio y fin</Text>
      <View style={{ flexDirection: "row", gap: Gap.sm }}>
        <View style={{ flex: 1 }}>
          <DatePicker value={startValue} onChange={onStartChange} />
        </View>
        <View style={{ flex: 1 }}>
          <DatePicker value={endValue} onChange={onEndChange} />
        </View>
      </View>
    </View>
  )
}
