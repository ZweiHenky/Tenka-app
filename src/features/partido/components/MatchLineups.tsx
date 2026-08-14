import { Text, TouchableOpacity, View } from "react-native"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import type { PartidoParticipacion } from "../scoring"

interface Props {
  localName: string
  visitorName: string
  participations: PartidoParticipacion[]
  onPlayerPress: (playerId: string) => void
}

function LineupColumn({ title, side, participations, onPlayerPress }: { title: string; side: "LOCAL" | "VISITANTE"; participations: PartidoParticipacion[]; onPlayerPress: (id: string) => void }) {
  const players = participations.filter((item) => item.ladoMarcador === side).sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999) || (a.jugadorNombre ?? "").localeCompare(b.jugadorNombre ?? ""))
  return (
    <View style={{ flex: 1, gap: Gap.sm }}>
      <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "uppercase" }} numberOfLines={1}>{title}</Text>
      {players.map((player) => (
        <TouchableOpacity key={player.id ?? `${side}-${player.jugadorId}`} disabled={!player.jugadorId} onPress={() => player.jugadorId && onPlayerPress(player.jugadorId)} style={{ flexDirection: "row", gap: Gap.sm, paddingVertical: Pad.micro }}>
          <Text style={{ width: 24, color: Palette.cyan, fontSize: 12, fontFamily: Fonts.semiBold }}>{player.dorsal ?? "-"}</Text>
          <Text style={{ color: Palette.text, fontSize: 12, flex: 1 }} numberOfLines={2}>{player.jugadorNombre ?? "Jugador"}</Text>
        </TouchableOpacity>
      ))}
      {players.length === 0 ? <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Sin registro</Text> : null}
    </View>
  )
}

export default function MatchLineups(props: Props) {
  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
      <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.display }}>Alineaciones</Text>
      {props.participations.length === 0 ? <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Alineaciones no registradas</Text> : (
        <View style={{ flexDirection: "row", gap: Gap.lg }}>
          <LineupColumn title={props.localName} side="LOCAL" participations={props.participations} onPlayerPress={props.onPlayerPress} />
          <View style={{ width: 1, backgroundColor: Palette.border }} />
          <LineupColumn title={props.visitorName} side="VISITANTE" participations={props.participations} onPlayerPress={props.onPlayerPress} />
        </View>
      )}
    </View>
  )
}
