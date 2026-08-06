import { Text, View } from "react-native"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"

interface Props {
  team: { nombre: string; logo: string | null; codigo: string }
  division: {
    nombre: string
    liga?: { nombre: string; logo: string | null } | null
    categoria?: { nombre: string } | null
    estadoLiga?: { nombre: string } | null
  }
}

export default function DivisionTeamInfoCard({ team, division }: Props) {
  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.md, gap: Gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
        <LogoImage uri={team.logo} size={52} backgroundColor={Palette.surfaceLight} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.6 }}>Equipo</Text>
          <Text style={{ color: Palette.text, fontSize: 18, fontFamily: Fonts.displayBold }} numberOfLines={1}>{team.nombre}</Text>
        </View>
        <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
          <Text style={{ color: Palette.cyan, fontSize: 11, fontFamily: Fonts.semiBold }}>#{team.codigo}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md }}>
        <LogoImage uri={division.liga?.logo} size={36} backgroundColor={Palette.surfaceLight} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }} numberOfLines={1}>{division.nombre}</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 11 }} numberOfLines={1}>
            {division.liga?.nombre ?? "Liga"}{division.categoria?.nombre ? ` · ${division.categoria.nombre}` : ""}
          </Text>
        </View>
        {division.estadoLiga?.nombre ? (
          <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
            <Text style={{ color: Palette.cyan, fontSize: 10, fontFamily: Fonts.semiBold }}>{division.estadoLiga.nombre}</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
