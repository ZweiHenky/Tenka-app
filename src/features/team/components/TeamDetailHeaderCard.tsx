import { Text, View } from "react-native"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"

interface Props {
  nombre: string
  logo: string | null
  codigo: string
}

export default function TeamDetailHeaderCard({ nombre, logo, codigo }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}>
      <LogoImage uri={logo} size={64} />
      <View style={{ flex: 1, gap: Gap.micro }}>
        <Text style={{ color: Palette.text, fontSize: 20, fontFamily: Fonts.displayBold }} numberOfLines={2}>{nombre}</Text>
        <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.medium }}>Código #{codigo}</Text>
      </View>
    </View>
  )
}
