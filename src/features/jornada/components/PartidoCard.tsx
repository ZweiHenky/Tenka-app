import { TouchableOpacity, View, Text, Image } from "react-native"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"

function formatHora(fechaStr: string): string {
  const d = new Date(fechaStr)
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

interface Props {
  partido: PartidoResponse
  onPress: (partido: PartidoResponse) => void
}

export default function PartidoCard({ partido: p, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(p)}
      style={{ borderRadius: Radius.md, paddingVertical: Pad.sm, paddingHorizontal: Pad.sm }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
        <View style={{ width: 60, alignItems: "center", gap: 2 }}>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: p.estado === "FINALIZADO" ? Palette.cyan
              : p.estado === "EN_JUEGO" ? Palette.success
              : p.estado === "SUSPENDIDO" ? Palette.danger
              : Palette.warning,
          }} />
          <Text style={{
            fontSize: 7, fontFamily: Fonts.semiBold,
            color: p.estado === "FINALIZADO" ? Palette.cyan
              : p.estado === "EN_JUEGO" ? Palette.success
              : p.estado === "SUSPENDIDO" ? Palette.danger
              : Palette.warning,
          }}>{p.estado === "PROGRAMADO" ? "PROG" : p.estado}</Text>
          {p.fecha ? (
            <Text style={{ color: Palette.warning, fontSize: 13, fontFamily: Fonts.semiBold }}>{formatHora(p.fecha)}</Text>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, overflow: "hidden", backgroundColor: Palette.surfaceLight }}>
              <Image source={p.equipoLocal?.logo ? { uri: p.equipoLocal.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 22, height: 22 }} resizeMode="cover" />
            </View>
            <Text style={{ fontSize: 13, color: Palette.text, fontFamily: Fonts.medium, flexShrink: 1 }} numberOfLines={1}>{p.equipoLocal?.nombre ?? ""}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, overflow: "hidden", backgroundColor: Palette.surfaceLight }}>
              <Image source={p.equipoVisitante?.logo ? { uri: p.equipoVisitante.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 22, height: 22 }} resizeMode="cover" />
            </View>
            <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.medium, flexShrink: 1 }} numberOfLines={1}>{p.equipoVisitante?.nombre ?? ""}</Text>
          </View>
        </View>
        <View style={{ width: 50, alignItems: "center", justifyContent: "center" }}>
          {p.estado === "FINALIZADO" ? (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontFamily: Fonts.displayBold, color: Palette.warning }}>{p.golesLocal}</Text>
              <View style={{ width: 20, height: 1, backgroundColor: Palette.textMuted, marginVertical: 1 }} />
              <Text style={{ fontSize: 16, fontFamily: Fonts.displayBold, color: Palette.textSecondary }}>{p.golesVisitante}</Text>
            </View>
          ) : p.estado === "EN_JUEGO" ? (
            <View style={{ backgroundColor: Palette.success, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 3 }}>
              <Text style={{ fontSize: 9, fontFamily: Fonts.semiBold, color: Palette.dark }}>EN VIVO</Text>
            </View>
          ) : p.estado === "SUSPENDIDO" ? (
            <View style={{ backgroundColor: Palette.danger, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 3 }}>
              <Text style={{ fontSize: 9, fontFamily: Fonts.semiBold, color: Palette.text }}>SUSP</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.textMuted }}>VS</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}
