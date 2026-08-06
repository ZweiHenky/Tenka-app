import { ActivityIndicator, Image, Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import type { GoleadoresResponse } from "../api/goleadores"

interface Props { data?: GoleadoresResponse; isLoading: boolean; error?: Error | null }

export default function GoleadoresTable({ data, isLoading, error }: Props) {
  if (isLoading) return <View style={{ alignItems: "center", padding: Pad.xl, gap: Gap.sm }}><ActivityIndicator color={Palette.cyan} /><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans }}>Cargando goleadores...</Text></View>
  if (error) return <View style={{ padding: Pad.lg, alignItems: "center", gap: Gap.sm }}><MaterialIcons name="error-outline" size={28} color={Palette.danger} /><Text style={{ color: Palette.textSecondary, textAlign: "center", fontFamily: Fonts.sans }}>No se pudo cargar la tabla de goleo.</Text></View>
  if (!data?.rows.length) return <View style={{ padding: Pad.xl, alignItems: "center", gap: Gap.sm }}><MaterialIcons name="sports-soccer" size={30} color={Palette.textMuted} /><Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans }}>Aún no hay goleadores registrados.</Text></View>
  return <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, padding: Pad.md, backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border }}><MaterialIcons name="emoji-events" size={18} color={Palette.cyan} /><Text style={{ color: Palette.text, fontFamily: Fonts.display }}>Tabla de goleo</Text></View>
    {data.rows.map((row) => <View key={row.jugadorId} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.md, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
      <Text style={{ width: 26, textAlign: "center", color: row.rank <= 3 ? Palette.cyan : Palette.textMuted, fontFamily: Fonts.displayBold }}>{row.rank}</Text>
      <View style={{ width: 40, height: 40, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight }}>{row.foto ? <Image source={{ uri: row.foto }} style={{ width: 40, height: 40 }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="person" size={22} color={Palette.textMuted} /></View>}</View>
      <View style={{ flex: 1, gap: 2 }}><Text numberOfLines={1} style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>{row.nombre}</Text><Text numberOfLines={2} style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 10 }}>{row.equipos.map((team) => `${team.nombre} ${team.goles}`).join(" · ")}</Text></View>
      <View style={{ alignItems: "center" }}><Text style={{ color: Palette.cyan, fontFamily: Fonts.displayBold, fontSize: 20 }}>{row.goles}</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 9 }}>GOLES</Text></View>
    </View>)}
    {data.unattributedGoals > 0 ? <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 10, padding: Pad.md, textAlign: "right" }}>Sin atribuir: {data.unattributedGoals}</Text> : null}
  </View>
}
