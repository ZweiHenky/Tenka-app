import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface Props {
  message?: string
  onRetry?: () => void
  fullScreen?: boolean
}

export default function ErrorState({ message = "Ocurrió un error al cargar los datos", onRetry, fullScreen = false }: Props) {
  const content = (
    <View style={{ alignItems: "center", gap: Gap.md, paddingHorizontal: Pad.xl }}>
      <MaterialIcons name="error-outline" size={48} color={Palette.danger} />
      <Text style={{ color: Palette.textSecondary, fontSize: 14, textAlign: "center" }}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.7}
          style={{
            backgroundColor: Palette.cyan,
            borderRadius: Radius.md,
            paddingVertical: Pad.sm,
            paddingHorizontal: Pad.lg,
          }}
        >
          <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 14 }}>Reintentar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )

  if (fullScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center" }}>
        {content}
      </View>
    )
  }

  return content
}
