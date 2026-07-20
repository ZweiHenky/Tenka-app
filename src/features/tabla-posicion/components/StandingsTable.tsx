import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Pad, Gap, Palette, Fonts } from "@/constants/theme"
import type { TablaPosicionRow } from "../api/tablaPosicion"

interface Props {
  rows: TablaPosicionRow[]
  isLoading: boolean
  onTeamPress?: (teamId: string) => void
}

export default function StandingsTable({ rows, isLoading, onTeamPress }: Props) {
  if (isLoading) {
    return <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.sans, padding: Pad.base }}>Cargando tabla...</Text>
  }

  if (rows.length === 0) {
    return <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.sans, padding: Pad.base }}>Sin posiciones registradas</Text>
  }

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.cyan10, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
        <MaterialIcons name="emoji-events" size={16} color={Palette.cyan} style={{ marginRight: 6 }} />
        <Text style={{ fontSize: 13, fontFamily: Fonts.display, color: Palette.text }}>Posiciones</Text>
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: Pad.sm, paddingVertical: Pad.sm, marginTop: Gap.sm }}>
        <Text style={{ width: 26, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.cyan, textAlign: "center" }}>#</Text>
        <Text style={{ flex: 1, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.text }}>EQUIPO</Text>
        <Text style={{ width: 22, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.text, textAlign: "center" }}>PJ</Text>
        <Text style={{ width: 22, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.text, textAlign: "center" }}>G</Text>
        <Text style={{ width: 22, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.text, textAlign: "center" }}>E</Text>
        <Text style={{ width: 22, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.danger, textAlign: "center" }}>P</Text>
        <Text style={{ width: 26, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.text, textAlign: "center" }}>DG</Text>
        <Text style={{ width: 26, fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.cyan, textAlign: "center" }}>PTS</Text>
      </View>
      <View style={{ gap: 6 }}>
        {rows.map((r, i) => (
          <TouchableOpacity key={r.id} activeOpacity={onTeamPress ? 0.75 : 1} onPress={() => onTeamPress?.(r.equipoId)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, backgroundColor: i < 3 ? Palette.cyan10 : "transparent" }}>
            <Text style={{ width: 26, fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan, textAlign: "center" }}>{i + 1}</Text>
            <Text style={{ flex: 1, fontSize: 12, color: Palette.text, fontFamily: Fonts.semiBold }} numberOfLines={1}>{r.equipo?.nombre ?? r.equipoId.slice(0, 8)}</Text>
            <Text style={{ width: 22, fontSize: 12, color: Palette.text, textAlign: "center" }}>{r.partidosJugados}</Text>
            <Text style={{ width: 22, fontSize: 12, color: Palette.text, textAlign: "center" }}>{r.ganados}</Text>
            <Text style={{ width: 22, fontSize: 12, color: Palette.text, textAlign: "center" }}>{r.empatados}</Text>
            <Text style={{ width: 22, fontSize: 12, color: Palette.danger, textAlign: "center" }}>{r.perdidos}</Text>
            <Text style={{ width: 26, fontSize: 12, color: r.diferenciaGoles < 0 ? Palette.danger : Palette.text, textAlign: "center" }}>{r.diferenciaGoles > 0 ? `+${r.diferenciaGoles}` : r.diferenciaGoles}</Text>
            <Text style={{ width: 26, fontSize: 13, fontFamily: Fonts.displayBold, color: Palette.cyan, textAlign: "center" }}>{r.puntos}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
