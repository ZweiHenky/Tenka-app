import { useState } from "react"
import { View, Text, TouchableOpacity, Keyboard } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import {
  calculateTimeRangeCapacity,
  parseTimeRanges,
  setTimeMinute,
  shiftTimeHour,
  TIME_MINUTES,
  validateTimeRange,
} from "@/shared/utils/time-range"
import AppBottomSheetModal from "./AppBottomSheetModal"
import { useToast } from "./Toast"

interface Props {
  value: string
  onChange: (val: string) => void
  matchDuration?: number
  breakDuration?: number
}

interface TimeSelectorProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function TimeSelector({ label, value, onChange }: TimeSelectorProps) {
  const [selectedHour = "00", selectedMinute = "00"] = value.split(":")

  return (
    <View style={{ flex: 1, gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm }}>
      <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textAlign: "center" }}>{label}</Text>
      <Text style={{ fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.cyan, textAlign: "center" }}>{value}</Text>
      <Text style={{ fontSize: 11, fontFamily: Fonts.medium, color: Palette.textMuted, textAlign: "center", textTransform: "uppercase" }}>Hora</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Restar una hora a ${label.toLowerCase()}`}
          onPress={() => onChange(shiftTimeHour(value, -1))}
          style={{ width: 44, height: 44, borderRadius: Radius.full, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="remove" size={24} color={Palette.cyan} />
        </TouchableOpacity>
        <View style={{ minWidth: 36, height: 44, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 20, fontFamily: Fonts.displayBold, color: Palette.text }}>{selectedHour}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Sumar una hora a ${label.toLowerCase()}`}
          onPress={() => onChange(shiftTimeHour(value, 1))}
          style={{ width: 44, height: 44, borderRadius: Radius.full, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="add" size={24} color={Palette.cyan} />
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 11, fontFamily: Fonts.medium, color: Palette.textMuted, textAlign: "center", textTransform: "uppercase" }}>Minutos</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: Gap.micro }}>
        {TIME_MINUTES.map((minute) => (
          <TouchableOpacity key={minute} onPress={() => onChange(setTimeMinute(value, minute))} style={{ minWidth: 42, paddingVertical: Pad.sm, paddingHorizontal: Pad.sm, borderRadius: Radius.md, backgroundColor: selectedMinute === minute ? Palette.cyan : Palette.surfaceLight, borderWidth: 1, borderColor: selectedMinute === minute ? Palette.cyan : Palette.border }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: selectedMinute === minute ? Palette.black : Palette.text, textAlign: "center" }}>{minute}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function capacityLabel(matchCount: number, remainingMinutes: number): string {
  const matches = `${matchCount} ${matchCount === 1 ? "partido" : "partidos"} por día`
  return remainingMinutes > 0 ? `${matches} · ${remainingMinutes} min libres` : `${matches} · sin tiempo sobrante`
}

export function TimeRangePicker({ value, onChange, matchDuration, breakDuration = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [tempStart, setTempStart] = useState("")
  const [tempEnd, setTempEnd] = useState("")
  const toast = useToast()

  const ranges = parseTimeRanges(value)

  const openPickerForIndex = (index: number) => {
    Keyboard.dismiss()
    setTempStart(ranges[index]?.start || "14:00")
    setTempEnd(ranges[index]?.end || "22:00")
    setEditingIndex(index)
    setOpen(true)
  }

  const confirmRange = () => {
    if (!matchDuration || matchDuration <= 0) {
      toast.error("Primero ingresa la duración del partido")
      return
    }
    const error = validateTimeRange(tempStart, tempEnd, ranges, editingIndex)
    if (error) { toast.error(error); return }
    const capacity = calculateTimeRangeCapacity(tempStart, tempEnd, matchDuration, breakDuration)
    if (capacity.matchCount === 0) {
      toast.error("El rango no alcanza para un partido completo")
      return
    }
    const newRanges = [...ranges]
    newRanges[editingIndex] = { start: tempStart, end: tempEnd }
    onChange(newRanges.map((r) => `${r.start} - ${r.end}`).join(" / "))
    setOpen(false)
    setEditingIndex(-1)
  }

  const addRange = () => {
    openPickerForIndex(ranges.length)
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
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontFamily: Fonts.sans, color: Palette.text }}>{range.start} - {range.end}</Text>
              {matchDuration && matchDuration > 0 ? (() => {
                const capacity = calculateTimeRangeCapacity(range.start, range.end, matchDuration, breakDuration)
                return (
                  <Text style={{ fontSize: 11, fontFamily: Fonts.sans, color: capacity.matchCount > 0 ? Palette.textMuted : Palette.danger }}>
                    {capacity.matchCount > 0 ? capacityLabel(capacity.matchCount, capacity.remainingMinutes) : "No alcanza para un partido completo"}
                  </Text>
                )
              })() : null}
            </View>
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

      <AppBottomSheetModal visible={open} onClose={() => { setOpen(false); setEditingIndex(-1) }} title="Horario de partido" snapPoints={["75%"]} scrollable={false} enableContentPanningGesture={false}>

            <View style={{ flexDirection: "row", gap: Gap.md }}>
              <TimeSelector label="Inicio" value={tempStart} onChange={setTempStart} />
              <TimeSelector label="Fin" value={tempEnd} onChange={setTempEnd} />
            </View>

            {matchDuration && matchDuration > 0 && tempStart && tempEnd ? (() => {
              const capacity = calculateTimeRangeCapacity(tempStart, tempEnd, matchDuration, breakDuration)
              return (
                <View style={{ backgroundColor: capacity.matchCount > 0 ? Palette.cyan10 : Palette.danger10, borderRadius: Radius.md, padding: Pad.sm, borderWidth: 1, borderColor: capacity.matchCount > 0 ? Palette.cyan : Palette.danger }}>
                  <Text style={{ color: capacity.matchCount > 0 ? Palette.cyan : Palette.danger, fontFamily: Fonts.semiBold, fontSize: 13, textAlign: "center" }}>
                    {capacity.matchCount > 0 ? capacityLabel(capacity.matchCount, capacity.remainingMinutes) : "El rango no alcanza para un partido completo"}
                  </Text>
                </View>
              )
            })() : null}

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
