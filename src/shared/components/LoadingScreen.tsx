import { View, Text, ActivityIndicator } from "react-native"
import { Palette, Gap } from "@/constants/theme"

interface Props {
  message?: string
}

export default function LoadingScreen({ message }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", gap: Gap.md }}>
      <ActivityIndicator size="large" color={Palette.cyan} />
      {message ? <Text style={{ color: Palette.textSecondary, fontSize: 14 }}>{message}</Text> : null}
    </View>
  )
}
