import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"

interface Props {
  slot: TimeSlotConfig
  localNombre?: string
  visitanteNombre?: string
  canchaNombre?: string
  showSwapIcon: boolean
  showCanchaPicker: boolean
  hasCourtConflict?: boolean
  pendingDelete?: boolean
  onCycleDay: (slot: TimeSlotConfig) => void
  onClearSlot: (slotId: string) => void
  onAssignTeam: (slotId: string, side: "local" | "visitante") => void
  onChangeTime: (slot: TimeSlotConfig) => void
  onSelectCancha?: (slotId: string) => void
}

function tipoColor(tipo: string | undefined): string {
  if (tipo === 'amistoso') return Palette.success
  if (tipo === 'complemento') return Palette.warning
  if (tipo === 'eliminatoria') return Palette.playoff
  return Palette.cyan
}

function tipoBg(tipo: string | undefined): string {
  if (tipo === 'amistoso') return Palette.success10
  if (tipo === 'complemento') return Palette.warning10
  if (tipo === 'eliminatoria') return Palette.playoff10
  return Palette.cyan10
}

function tipoLabel(tipo: string | undefined): string {
  if (tipo === 'amistoso') return 'Amistoso'
  if (tipo === 'complemento') return 'Completar'
  if (tipo === 'eliminatoria') return 'Eliminatoria'
  return 'Regular'
}

export default function TimeSlotCard({ slot, localNombre, visitanteNombre, canchaNombre, showSwapIcon, showCanchaPicker, hasCourtConflict, pendingDelete, onCycleDay, onClearSlot, onAssignTeam, onChangeTime, onSelectCancha }: Props) {
  const color = tipoColor(slot.tipo)
  const bg = tipoBg(slot.tipo)
  const esEliminatoria = slot.tipo === "eliminatoria"
  const textColor = Palette.text
  const textMuted = Palette.textMuted

  return (
    <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.sm, borderWidth: 1, borderColor: hasCourtConflict ? Palette.danger : color, position: "relative" }}>
      {slot.tipo ? (
        <View style={{ position: "absolute", top: -10, left: 12, height: 18, flexDirection: "row", alignItems: "center", gap: Gap.micro, backgroundColor: Palette.surfaceLight, paddingHorizontal: Pad.sm }}>
          {slot.tipo === "eliminatoria" ? <MaterialIcons name="emoji-events" size={12} color={color} /> : null}
          <Text style={{ color, fontSize: 11, fontFamily: Fonts.semiBold }}>{esEliminatoria ? slot.rondaNombre : tipoLabel(slot.tipo)}</Text>
        </View>
      ) : null}
      {!esEliminatoria ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, flex: 1 }}>
            <TouchableOpacity onPress={() => onChangeTime(slot)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <MaterialIcons name="access-time" size={16} color={color} />
              <Text style={{ color: textColor, fontSize: 14, fontFamily: Fonts.semiBold }}>{slot.horaInicio} - {slot.horaFin}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: Gap.sm }}>
            {showSwapIcon ? (
              <TouchableOpacity onPress={() => onCycleDay(slot)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="swap-horiz" size={16} color={Palette.cyan} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => onClearSlot(slot.id)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: pendingDelete ? Palette.danger10 : "transparent", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name={pendingDelete ? "delete-forever" : "delete-outline"} size={18} color={pendingDelete ? Palette.danger : Palette.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {esEliminatoria ? (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <TouchableOpacity onPress={() => onChangeTime(slot)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <MaterialIcons name="access-time" size={16} color={color} />
              <Text style={{ color: textColor, fontSize: 14, fontFamily: Fonts.semiBold }}>{slot.horaInicio} - {slot.horaFin}</Text>
            </TouchableOpacity>
            {showSwapIcon ? (
              <TouchableOpacity onPress={() => onCycleDay(slot)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="swap-horiz" size={16} color={Palette.cyan} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <View style={{ flex: 1, backgroundColor: bg, borderRadius: Radius.md, padding: Pad.sm, alignItems: "center", minHeight: 48, justifyContent: "center" }}>
              <Text style={{ color: localNombre ? textColor : textMuted, fontSize: 13, fontFamily: Fonts.semiBold }}>{localNombre ?? "?"}</Text>
            </View>
            <Text style={{ color: textMuted, fontSize: 13, fontFamily: Fonts.semiBold }}>VS</Text>
            <View style={{ flex: 1, backgroundColor: bg, borderRadius: Radius.md, padding: Pad.sm, alignItems: "center", minHeight: 48, justifyContent: "center" }}>
              <Text style={{ color: visitanteNombre ? textColor : textMuted, fontSize: 13, fontFamily: Fonts.semiBold }}>{visitanteNombre ?? "?"}</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: "row", gap: Gap.sm }}>
          <TouchableOpacity onPress={() => onAssignTeam(slot.id, "local")} style={{ flex: 1, backgroundColor: Palette.cyan10, borderRadius: Radius.md, padding: Pad.sm, alignItems: "center", minHeight: 48, justifyContent: "center" }}>
            {localNombre ? (
              <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>{localNombre}</Text>
            ) : (
              <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>{slot.tipo === 'complemento' ? 'Puntos' : 'Local'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onAssignTeam(slot.id, "visitante")} style={{ flex: 1, backgroundColor: Palette.cyan10, borderRadius: Radius.md, padding: Pad.sm, alignItems: "center", minHeight: 48, justifyContent: "center" }}>
            {visitanteNombre ? (
              <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>{visitanteNombre}</Text>
            ) : (
              <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>{slot.tipo === 'complemento' ? 'Sin puntos' : 'Visitante'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {showCanchaPicker && onSelectCancha ? (
        <TouchableOpacity onPress={() => onSelectCancha(slot.id)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, marginTop: Gap.sm }}>
          <MaterialIcons name="place" size={16} color={Palette.warning} />
          <Text style={{ color: canchaNombre ? Palette.text : Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>{canchaNombre ? `Cancha: ${canchaNombre}` : "Asignar cancha"}</Text>
        </TouchableOpacity>
      ) : null}
      {hasCourtConflict ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.danger10, borderRadius: Radius.md, padding: Pad.sm }}>
          <MaterialIcons name="error-outline" size={16} color={Palette.danger} />
          <Text style={{ color: Palette.danger, fontSize: 11, fontFamily: Fonts.semiBold, flex: 1 }}>Esta cancha está ocupada en ese horario</Text>
        </View>
      ) : null}
    </View>
  )
}
