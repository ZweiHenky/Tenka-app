import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface Props {
  message: string
  icon?: keyof typeof MaterialIcons.glyphMap
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ message, icon = "info-outline", actionLabel, onAction }: Props) {
  return (
    <View style={{ alignItems: "center", gap: Gap.md, paddingVertical: Pad.xl, paddingHorizontal: Pad.xl }}>
      <MaterialIcons name={icon} size={40} color={Palette.textMuted} />
      <Text style={{ color: Palette.textMuted, fontSize: 14, textAlign: "center" }}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          style={{
            backgroundColor: Palette.cyan,
            borderRadius: Radius.md,
            paddingVertical: Pad.sm,
            paddingHorizontal: Pad.lg,
          }}
        >
          <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 14 }}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}
