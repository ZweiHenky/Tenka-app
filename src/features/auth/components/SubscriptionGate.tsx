import { View, Text } from "react-native"
import { authClient } from "@/infrastructure/auth/client"
import { Gap, Palette, Pad } from "@/constants/theme"

interface SubscriptionGateProps {
  children: React.ReactNode
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { data: session } = authClient.useSession()
  const rol = (session?.user as any)?.rol

  if (rol === "CAPITAN") {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", paddingHorizontal: Pad.xxl }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: Palette.text, textAlign: "center", marginBottom: Gap.sm }}>
          Suscripción requerida
        </Text>
        <Text style={{ fontSize: 14, color: Palette.textSecondary, textAlign: "center", lineHeight: 20 }}>
          Necesitas suscribirte para ver el contenido de las ligas.
        </Text>
      </View>
    )
  }

  return <>{children}</>
}
