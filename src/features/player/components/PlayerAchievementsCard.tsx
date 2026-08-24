import { Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { formatMonthYear } from "@/shared/utils/date-time"
import type { CampeonatoJugador } from "@/features/division-campeon/api/divisionCampeon"

interface Props {
  logros: CampeonatoJugador[]
}

/**
 * Los títulos de campeón de goleo del jugador.
 *
 * Los nombres salen de los snapshots del título, no de la división: puede haberse borrado y el
 * logro tiene que seguir siendo legible. Sin logros la tarjeta no se dibuja — un jugador sin
 * títulos no necesita que se lo recuerden.
 */
export default function PlayerAchievementsCard({ logros }: Props) {
  if (logros.length === 0) return null

  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        <MaterialIcons name="workspace-premium" size={18} color={Palette.warning} />
        <Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 16 }}>Logros</Text>
      </View>

      {logros.map((logro) => (
        <View
          key={logro.id}
          style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.warning10, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.warning, padding: Pad.md }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: Palette.warning, fontSize: 10, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Campeón de goleo</Text>
            <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }} numberOfLines={1}>{logro.divisionNombre}</Text>
            <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }} numberOfLines={1}>{logro.ligaNombre}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            {logro.jugadorGoles != null ? (
              <Text style={{ color: Palette.warning, fontSize: 18, fontFamily: Fonts.displayBold }}>{logro.jugadorGoles}</Text>
            ) : null}
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "capitalize" }}>
              {formatMonthYear(logro.createdAt)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}
