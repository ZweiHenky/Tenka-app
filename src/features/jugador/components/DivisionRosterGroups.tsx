import { Image, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { POSICIONES_JUGADOR, type DivisionJugador } from "@/domain/interfaces/player"
import { groupDivisionRoster, type RosterGroupKey } from "@/features/jugador/utils/rosterGroups"

const GROUP_ICONS: Record<RosterGroupKey, keyof typeof MaterialIcons.glyphMap> = {
  delanteros: "sports-soccer",
  medios: "swap-horiz",
  defensas: "shield",
  porteros: "sports-handball",
}

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((item) => item.id === posicion)?.nombre ?? posicion
}

interface Props {
  players: DivisionJugador[]
  onPlayerPress?: (playerId: string) => void
}

export default function DivisionRosterGroups({ players, onPlayerPress }: Props) {
  return (
    <View style={{ gap: Gap.sm }}>
      {groupDivisionRoster(players).map((group) => (
        <View key={group.key} style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.cyan10, paddingHorizontal: Pad.md, paddingVertical: Pad.sm }}>
            <MaterialIcons name={GROUP_ICONS[group.key]} size={17} color={Palette.cyan} />
            <Text style={{ flex: 1, color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 13 }}>{group.label}</Text>
            <Text style={{ color: Palette.cyan, fontFamily: Fonts.displayBold, fontSize: 12 }}>{group.players.length}</Text>
          </View>
          {group.players.length === 0 ? (
            <Text style={{ color: Palette.textMuted, fontSize: 12, paddingHorizontal: Pad.md, paddingVertical: Pad.base }}>Sin jugadores</Text>
          ) : (
            group.players.map((row, index) => (
              <TouchableOpacity
                key={row.jugadorId}
                activeOpacity={onPlayerPress ? 0.78 : 1}
                disabled={!onPlayerPress}
                onPress={() => onPlayerPress?.(row.jugadorId)}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.sm, marginHorizontal: Pad.sm, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: Palette.border }}
              >
                <Image source={row.jugador.foto ? { uri: row.jugador.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 40, height: 40, borderRadius: Radius.full }} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }}>{row.jugador.nombre}</Text>
                  <Text style={{ color: Palette.textMuted, fontSize: 11 }}>{formatPosicion(row.jugador.posicion)}</Text>
                </View>
                <View style={{ minWidth: 36, height: 30, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center", paddingHorizontal: Pad.sm }}>
                  <Text style={{ color: Palette.cyan, fontFamily: Fonts.displayBold, fontSize: 12 }}>#{row.dorsal}</Text>
                </View>
                {onPlayerPress ? <MaterialIcons name="chevron-right" size={18} color={Palette.textMuted} /> : null}
              </TouchableOpacity>
            ))
          )}
        </View>
      ))}
    </View>
  )
}
