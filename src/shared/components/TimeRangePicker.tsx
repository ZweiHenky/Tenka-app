import { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, Keyboard } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import AppBottomSheetModal from "./AppBottomSheetModal"
import { useToast } from "./Toast"

interface Props {
  value: string
  onChange: (val: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

function parseRanges(value: string): { start: string; end: string }[] {
  if (!value) return []
  return value.split(" / ").map((r) => {
    let parts = r.split(" - ").map((s) => s.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    parts = r.split("-").map((s) => s.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    return null
  }).filter(Boolean) as { start: string; end: string }[]
}

function validateRange(start: string, end: string, allRanges: { start: string; end: string }[], index: number): string | null {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (e <= s) return "La hora de fin debe ser posterior a la hora de inicio"
  for (let i = 0; i < allRanges.length; i++) {
    if (i === index) continue
    const a = timeToMinutes(allRanges[i].start)
    const b = timeToMinutes(allRanges[i].end)
    if (s < b && e > a) return "Los rangos de horario no deben superponerse"
  }
  return null
}

export function TimeRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [tempStart, setTempStart] = useState("")
  const [tempEnd, setTempEnd] = useState("")
  const toast = useToast()

  const ranges = parseRanges(value)

  const openPickerForIndex = (index: number) => {
    Keyboard.dismiss()
    setTempStart(ranges[index]?.start || "14:00")
    setTempEnd(ranges[index]?.end || "22:00")
    setEditingIndex(index)
    setOpen(true)
  }

  const confirmRange = () => {
    const error = validateRange(tempStart, tempEnd, ranges, editingIndex)
    if (error) { toast.error(error); return }
    const newRanges = [...ranges]
    newRanges[editingIndex] = { start: tempStart, end: tempEnd }
    onChange(newRanges.map((r) => `${r.start} - ${r.end}`).join(" / "))
    setOpen(false)
    setEditingIndex(-1)
  }

  const addRange = () => {
    const error = validateRange("14:00", "22:00", ranges, -1)
    if (error) { toast.error(error); return }
    const newRanges = [...ranges, { start: "14:00", end: "22:00" }]
    onChange(newRanges.map((r) => `${r.start} - ${r.end}`).join(" / "))
  }

  const removeRange = (index: number) => {
    const newRanges = ranges.filter((_, i) => i !== index)
    onChange(newRanges.map((r) => `${r.start} - ${r.end}`).join(" / "))
  }

  return (
    <View style={{ gap: Gap.sm }}>
      {ranges.map((range, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
          <TouchableOpacity onPress={() => openPickerForIndex(i)} style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.md, paddingVertical: Pad.sm, gap: Gap.sm }}>
            <MaterialIcons name="access-time" size={20} color={Palette.cyan} />
            <Text style={{ flex: 1, fontSize: 14, fontFamily: Fonts.sans, color: Palette.text }}>{range.start} - {range.end}</Text>
            <MaterialIcons name="edit" size={18} color={Palette.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeRange(i)} style={{ padding: 4 }}>
            <MaterialIcons name="close" size={20} color={Palette.danger} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addRange} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Palette.cyan10, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.cyan, paddingVertical: Pad.sm, gap: Gap.sm }}>
        <MaterialIcons name="add" size={20} color={Palette.cyan} />
        <Text style={{ fontSize: 14, fontFamily: Fonts.sans, color: Palette.cyan }}>Agregar rango</Text>
      </TouchableOpacity>

      <AppBottomSheetModal visible={open} onClose={() => { setOpen(false); setEditingIndex(-1) }} title="Horario de partido" snapPoints={["65%"]} scrollable={false} enableContentPanningGesture={false}>

            <View style={{ flexDirection: "row", gap: Gap.md }}>
              <View style={{ flex: 1, gap: Gap.sm }}>
                <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, textAlign: "center" }}>Inicio</Text>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {HOURS.map((h) => (
                    <TouchableOpacity key={h} onPress={() => setTempStart(h)} style={{ paddingVertical: Pad.sm, paddingHorizontal: Pad.md, borderRadius: Radius.md, backgroundColor: tempStart === h ? Palette.cyan : "transparent" }}>
                      <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: tempStart === h ? Palette.black : Palette.text, textAlign: "center" }}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={{ flex: 1, gap: Gap.sm }}>
                <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, textAlign: "center" }}>Fin</Text>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {HOURS.map((h) => (
                    <TouchableOpacity key={h} onPress={() => setTempEnd(h)} style={{ paddingVertical: Pad.sm, paddingHorizontal: Pad.md, borderRadius: Radius.md, backgroundColor: tempEnd === h ? Palette.cyan : "transparent" }}>
                      <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: tempEnd === h ? Palette.black : Palette.text, textAlign: "center" }}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <TouchableOpacity onPress={() => { setOpen(false); setEditingIndex(-1) }} style={{ flex: 1, paddingVertical: Pad.sm, borderRadius: Radius.md, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontFamily: Fonts.semiBold, color: Palette.danger }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmRange} style={{ flex: 1, paddingVertical: Pad.sm, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontFamily: Fonts.semiBold, color: Palette.black }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
      </AppBottomSheetModal>
    </View>
  )
}
