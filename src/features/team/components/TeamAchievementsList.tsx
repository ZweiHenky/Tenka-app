import { Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import EmptyState from "@/shared/components/EmptyState"
import { formatMonthYear } from "@/shared/utils/date-time"
import type { CampeonatoEquipo } from "@/features/division-campeon/api/divisionCampeon"

interface Props {
  logros: CampeonatoEquipo[]
}

/**
 * El palmarés del equipo: las divisiones que ganó, más nuevas arriba.
 *
 * `workspace-premium` en `Palette.warning` es el mismo par que identifica al campeón en el resto
 * de la app; `emoji-events` ya está tomado por otras cosas.
 *
 * Los nombres salen de los snapshots del título, no de la división: puede haberse borrado y el
 * logro tiene que seguir siendo legible.
 */
export default function TeamAchievementsList({ logros }: Props) {
  if (logros.length === 0) {
    return <EmptyState message="Este equipo todavía no ha ganado ninguna división" icon="workspace-premium" />
  }

  return (
    <View style={{ gap: Gap.sm }}>
      {logros.map((logro) => (
        <View
          key={logro.id}
          style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.warning, padding: Pad.base }}
        >
          <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.warning10, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="workspace-premium" size={22} color={Palette.warning} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }} numberOfLines={1}>{logro.divisionNombre}</Text>
            <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }} numberOfLines={1}>{logro.ligaNombre}</Text>
          </View>
          <Text style={{ color: Palette.warning, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "capitalize" }}>
            {formatMonthYear(logro.createdAt)}
          </Text>
        </View>
      ))}
    </View>
  )
}
