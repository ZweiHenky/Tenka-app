import { View, Text, TouchableOpacity } from "react-native"
import { useNavigation } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Palette, Fonts } from "@/constants/theme"

interface HeaderAction {
  icon: keyof typeof MaterialIcons.glyphMap
  onPress: () => void
  color?: string
  bg?: string
  ref?: React.RefObject<any>
  onLayout?: () => void
}

interface Props {
  title: string
  titleFontFamily?: string
  titleLetterSpacing?: number
  titleColor?: string
  rightActions?: HeaderAction[]
  onBack?: () => void
  onMenuPress?: () => void
}

export default function CustomHeader({ title, titleFontFamily, titleLetterSpacing, titleColor, rightActions, onBack, onMenuPress }: Props) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const handleMenu = onBack ?? onMenuPress ?? (() => (navigation as any).openDrawer?.())

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Palette.black,
      paddingHorizontal: Pad.base,
      paddingVertical: Pad.md,
      paddingTop: insets.top + Pad.sm,
    }}>
      <TouchableOpacity onPress={handleMenu} style={{ padding: 10 }}>
        <MaterialIcons name={onBack ? "arrow-back" : "menu"} size={28} color={Palette.text} />
      </TouchableOpacity>
      <Text style={{ flex: 1, fontSize: 18, fontFamily: titleFontFamily ?? Fonts.display, color: titleColor ?? Palette.text, letterSpacing: titleLetterSpacing ?? 0, textAlign: rightActions && rightActions.length > 0 ? "center" : "right" }} numberOfLines={1}>
        {title}
      </Text>
      {rightActions?.map((a, i) => (
        <TouchableOpacity key={i} ref={a.ref} onLayout={a.onLayout} onPress={a.onPress} style={{ width: 36, height: 36, borderRadius: Radius.full, backgroundColor: a.bg ?? Palette.cyan20, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name={a.icon} size={22} color={a.color ?? Palette.cyan} />
        </TouchableOpacity>
      ))}
    </View>
  )
}
