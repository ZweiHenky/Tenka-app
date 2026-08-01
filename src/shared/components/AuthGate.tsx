import { ActivityIndicator, View, Text, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import { authClient } from "@/infrastructure/auth/client"
import type { ReactNode } from "react"

export function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Palette.cyan} size="large" />
      </View>
    )
  }

  if (!session?.user) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, alignItems: "center", gap: Gap.lg, maxWidth: 320, width: "100%" }}>
          <View style={{ backgroundColor: Palette.cyan10, width: 72, height: 72, borderRadius: Radius.full, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="lock-outline" size={36} color={Palette.cyan} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: Palette.text, textAlign: "center" }}>Inicia sesión</Text>
          <Text style={{ fontSize: 14, color: Palette.textSecondary, textAlign: "center", lineHeight: 20 }}>
            Necesitas iniciar sesión para acceder a esta sección
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")} style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, paddingHorizontal: Pad.xl, width: "100%", alignItems: "center" }}>
            <Text style={{ color: Palette.black, fontWeight: "700", fontSize: 15 }}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return <>{children}</>
}
