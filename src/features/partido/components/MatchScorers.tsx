import { Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import type { PartidoAnotacion } from "../scoring"

interface Props {
  localName: string
  visitorName: string
  localScore: number
  visitorScore: number
  annotations: PartidoAnotacion[]
  onPlayerPress: (playerId: string) => void
}

function ScorerColumn({ title, side, score, annotations, onPlayerPress }: { title: string; side: "LOCAL" | "VISITANTE"; score: number; annotations: PartidoAnotacion[]; onPlayerPress: (id: string) => void }) {
  const assigned = annotations.filter((item) => item.ladoMarcador === side)
  const attributed = assigned.filter((item) => item.jugadorId).reduce((sum, item) => sum + item.cantidad, 0)
  const unattributed = Math.max(0, score - attributed)
  const rows = assigned.filter((item) => item.jugadorId && item.cantidad > 0)

  return (
    <View style={{ flex: 1, gap: Gap.sm }}>
      <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "uppercase" }} numberOfLines={1}>{title}</Text>
      {rows.map((item) => (
        <TouchableOpacity key={item.id ?? `${side}-${item.jugadorId}`} disabled={!item.jugadorId} onPress={() => item.jugadorId && onPlayerPress(item.jugadorId)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingVertical: Pad.micro }}>
          <MaterialIcons name="sports-soccer" size={15} color={Palette.cyan} />
          <Text style={{ color: Palette.text, fontSize: 12, flex: 1 }} numberOfLines={2}>{item.dorsal != null ? `#${item.dorsal} ` : ""}{item.jugadorNombre ?? "Jugador"}</Text>
          <Text style={{ color: Palette.cyan, fontFamily: Fonts.displayBold }}>{item.cantidad}</Text>
        </TouchableOpacity>
      ))}
      {unattributed > 0 ? <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingVertical: Pad.micro }}><MaterialIcons name="help-outline" size={15} color={Palette.textMuted} /><Text style={{ color: Palette.textMuted, fontSize: 12, flex: 1 }}>Gol sin asignar</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.displayBold }}>{unattributed}</Text></View> : null}
      {score === 0 ? <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Sin goles</Text> : null}
    </View>
  )
}

export default function MatchScorers(props: Props) {
  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
      <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.display }}>Goleadores</Text>
      <View style={{ flexDirection: "row", gap: Gap.lg }}>
        <ScorerColumn title={props.localName} side="LOCAL" score={props.localScore} annotations={props.annotations} onPlayerPress={props.onPlayerPress} />
        <View style={{ width: 1, backgroundColor: Palette.border }} />
        <ScorerColumn title={props.visitorName} side="VISITANTE" score={props.visitorScore} annotations={props.annotations} onPlayerPress={props.onPlayerPress} />
      </View>
    </View>
  )
}
