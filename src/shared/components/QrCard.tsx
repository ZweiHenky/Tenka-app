import { View, Text } from "react-native"
import QRCode from "react-native-qrcode-svg"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface Props {
  value: string
  label?: string
  hint?: string
}

export default function QrCard({ value, label, hint }: Props) {
  return (
    <View style={{ alignItems: "center", backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, gap: Gap.md }}>
      <Text style={{ fontSize: 16, fontFamily: Fonts.bold, color: Palette.text }}>{label ?? "Código QR"}</Text>
      <View style={{ backgroundColor: Palette.white, borderRadius: Radius.md, padding: Pad.md }}>
        <QRCode value={value} size={200} backgroundColor={Palette.white} color={Palette.black} />
      </View>
      <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.textMuted, textAlign: "center" }}>{hint ?? ""}</Text>
    </View>
  )
}
