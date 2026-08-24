import { Image, Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Fonts, Gap, Pad, Radius } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import type { DivisionCampeon } from "@/features/division-campeon/api/divisionCampeon"

interface Props {
  campeon: DivisionCampeon
}

/**
 * `workspace-premium` y no `emoji-events`: la copa ya decora la celda "Competencia", los encabezados
 * de posiciones y goleo, y el botón de generar el cuadro. Reutilizarla acá la volvería ambigua.
 */
export default function CampeonBanner({ campeon }: Props) {
  return (
    <View style={{ backgroundColor: Palette.warning10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.warning, padding: Pad.base, gap: Gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        <MaterialIcons name="workspace-premium" size={18} color={Palette.warning} />
        <Text style={{ color: Palette.warning, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Campeón</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
        <LogoImage uri={campeon.equipoLogo} size={44} backgroundColor={Palette.surface} />
        <Text style={{ flex: 1, color: Palette.text, fontSize: 17, fontFamily: Fonts.displayBold }} numberOfLines={1}>{campeon.equipoNombre}</Text>
      </View>

      {campeon.jugadorNombre ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, borderTopWidth: 1, borderTopColor: Palette.warning, paddingTop: Pad.md }}>
          <Image
            source={campeon.jugadorFoto ? { uri: campeon.jugadorFoto } : require("@/assets/ejemplos/logo.png")}
            style={{ width: 32, height: 32, borderRadius: Radius.full }}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Campeón de goleo</Text>
            <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }} numberOfLines={1}>{campeon.jugadorNombre}</Text>
          </View>
          {campeon.jugadorGoles != null ? (
            <Text style={{ color: Palette.warning, fontSize: 18, fontFamily: Fonts.displayBold }}>{campeon.jugadorGoles}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
