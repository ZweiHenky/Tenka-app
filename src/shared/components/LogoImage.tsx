import { Image, Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Palette, Radius } from "@/constants/theme"

const FALLBACK_LOGO = require("@/assets/ejemplos/logo.png")

interface LogoImageProps {
  uri?: string | null
  size: number
  radius?: number
  ring?: string | null
  ringWidth?: number
  backgroundColor?: string
  shadow?: boolean
  fallback?: number | null
  fallbackText?: string | null
  iconFallback?: keyof typeof MaterialIcons.glyphMap | null
}

export default function LogoImage({
  uri,
  size,
  radius = Radius.full,
  ring = null,
  ringWidth = 2,
  backgroundColor = Palette.surface,
  shadow = false,
  fallback = FALLBACK_LOGO,
  fallbackText = null,
  iconFallback = null,
}: LogoImageProps) {
  const hasRing = !!ring
  const innerSize = hasRing ? size - ringWidth * 2 : size

  const content = uri ? (
    <Image source={{ uri }} style={{ width: innerSize, height: innerSize }} resizeMode="cover" />
  ) : fallbackText ? (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: Math.round(innerSize * 0.38), fontFamily: Fonts.bold, color: Palette.cyan }}>
        {fallbackText.charAt(0).toUpperCase()}
      </Text>
    </View>
  ) : iconFallback ? (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <MaterialIcons name={iconFallback} size={Math.round(innerSize * 0.45)} color={Palette.textMuted} />
    </View>
  ) : fallback ? (
    <Image source={fallback} style={{ width: innerSize, height: innerSize }} resizeMode="cover" />
  ) : null

  const clip = (
    <View style={{ width: innerSize, height: innerSize, borderRadius: radius, overflow: "hidden", backgroundColor }}>
      {content}
    </View>
  )

  if (!hasRing && !shadow) return clip

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor,
        borderWidth: hasRing ? ringWidth : 0,
        borderColor: hasRing ? ring : "transparent",
        alignItems: "center",
        justifyContent: "center",
        ...(shadow
          ? { elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }
          : {}),
      }}
    >
      {clip}
    </View>
  )
}
