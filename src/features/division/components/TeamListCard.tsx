import { useState } from "react"
import { View, Text, Image, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface TeamItem {
  id: string
  nombre: string
  logo: string | null
}

interface Props {
  assigned: TeamItem[]
  arbitrajePagado: string[]
  onRemove: (nombre: string, id: string) => void
  onToggleArbitraje: (id: string) => void
  onQrScan?: () => void
  onToggleSelectAll?: () => void
  flat?: boolean
}

export default function TeamListCard({ assigned, arbitrajePagado, onRemove, onToggleArbitraje, onQrScan, onToggleSelectAll, flat }: Props) {
  const [minimized, setMinimized] = useState(false)
  const allSelected = assigned.length > 0 && arbitrajePagado.length === assigned.length

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...(flat ? { paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border } : { backgroundColor: Palette.cyan, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        <Text style={{ color: flat ? Palette.text : Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>
          {flat ? `Seleccionados ${arbitrajePagado.length}/${assigned.length}` : `Equipos (${assigned.length})`}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        {onQrScan ? (
          <TouchableOpacity onPress={onQrScan} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: flat ? Palette.surface : Palette.black, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="qr-code-scanner" size={16} color={flat ? Palette.cyan : Palette.cyan} />
          </TouchableOpacity>
        ) : null}
        {flat ? null : (
          <TouchableOpacity onPress={() => setMinimized((s) => !s)} style={{ padding: 4 }}>
            <MaterialIcons name={minimized ? "expand-more" : "expand-less"} size={24} color={Palette.dark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const content = (
    <View style={{ gap: Gap.md }}>
      {assigned.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: Pad.lg, gap: Gap.sm }}>
          <MaterialIcons name="sports" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.textMuted, fontSize: 14, textAlign: "center" }}>Presiona el código QR para agregar equipos</Text>
        </View>
      ) : (
        <>
          {onToggleSelectAll ? (
            <TouchableOpacity
              onPress={onToggleSelectAll}
              style={{ backgroundColor: Palette.surface, borderRadius: Radius.full, paddingHorizontal: Pad.base, paddingVertical: Pad.sm, borderWidth: 1, borderColor: Palette.cyan, alignSelf: "flex-start" }}
            >
              <Text style={{ color: Palette.cyan, fontSize: 13, fontFamily: Fonts.semiBold }}>
                {allSelected ? "Limpiar selección" : "Seleccionar todos"}
              </Text>
            </TouchableOpacity>
          ) : null}
          {assigned.map((t) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.sm, gap: Gap.sm }}>
              <TouchableOpacity onPress={() => onToggleArbitraje(t.id)} style={{ padding: 4 }}>
                <MaterialIcons name={arbitrajePagado.includes(t.id) ? "check-box" : "check-box-outline-blank"} size={26} color={arbitrajePagado.includes(t.id) ? Palette.cyan : Palette.textMuted} />
              </TouchableOpacity>
              <Image source={t.logo ? { uri: t.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 44, height: 44, borderRadius: Radius.lg }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: Fonts.bold, color: Palette.text }}>{t.nombre}</Text>
              </View>
              <TouchableOpacity onPress={() => onRemove(t.nombre, t.id)} style={{ padding: 10 }}>
                <MaterialIcons name="remove-circle-outline" size={24} color={Palette.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </View>
  )

  if (flat) {
    return (
      <View style={{ gap: Gap.md }}>
        {header}
        {!minimized ? content : null}
      </View>
    )
  }

  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
      {header}
      {!minimized && <View style={{ padding: Pad.base }}>{content}</View>}
    </View>
  )
}
