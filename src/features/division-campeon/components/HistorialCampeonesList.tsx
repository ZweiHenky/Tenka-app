import { Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import { formatMonthYear } from "@/shared/utils/date-time"
import type { CampeonHistorial } from "@/features/division-campeon/api/divisionCampeon"

interface Props {
  titulos: CampeonHistorial[]
}

/**
 * Los campeones de temporadas anteriores de esta división.
 *
 * En gris y no en dorado a propósito: el dorado es del campeón vigente, y conviene distinguirlos
 * de un vistazo cuando los dos están en la misma pantalla.
 */
export default function HistorialCampeonesList({ titulos }: Props) {
  if (titulos.length === 0) return null

  return (
    <View style={{ gap: Gap.sm }}>
      <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Títulos anteriores
      </Text>
      {titulos.map((titulo) => (
        <View
          key={titulo.id}
          style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.md }}
        >
          <MaterialIcons name="workspace-premium" size={18} color={Palette.textMuted} />
          <LogoImage uri={titulo.equipoLogo} size={28} backgroundColor={Palette.surfaceLight} />
          <Text style={{ flex: 1, color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }} numberOfLines={1}>{titulo.equipoNombre}</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "capitalize" }}>
            {formatMonthYear(titulo.createdAt)}
          </Text>
        </View>
      ))}
    </View>
  )
}
