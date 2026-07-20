import { View, Text, Image } from "react-native"
import { Radius, Pad, Palette, Fonts, Gap } from "@/constants/theme"

interface Props {
  nombre: string
  cancha: string | null
}

export default function LeagueHeroCard({ nombre, cancha }: Props) {
  return (
    <View style={{ borderRadius: Radius.lg, overflow: "hidden" }}>
      <Image source={cancha ? { uri: cancha } : require("@/assets/ejemplos/campo.jpg")} style={{ width: "100%", height: 250 }} resizeMode="cover" />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
      <View style={{
        position: "absolute", top: Pad.base, right: Pad.base,
        backgroundColor: Palette.cyan, borderRadius: Radius.sm, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro,
      }}>
        <Text style={{ color: Palette.black, fontSize: 10, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 1 }}>Liga</Text>
      </View>
      <View style={{
        position: "absolute", bottom: Pad.base, left: Pad.base, right: Pad.base,
      }}>
        <Text style={{ fontSize: 26, fontFamily: Fonts.displayBold, color: Palette.white }}>{nombre}</Text>
        <View style={{ width: 40, height: 3, backgroundColor: Palette.cyan, borderRadius: 2, marginTop: Gap.sm }} />
      </View>
    </View>
  )
}
