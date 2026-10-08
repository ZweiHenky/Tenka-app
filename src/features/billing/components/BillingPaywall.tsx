import { MaterialIcons } from "@expo/vector-icons"
import { router } from "expo-router"
import { Text, TouchableOpacity, View } from "react-native"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import type { ManagementReason } from "@/domain/interfaces/league"
import CustomHeader from "@/shared/components/CustomHeader"

interface Props {
  resourceName: string
  reason?: ManagementReason
}

function blockedMessage(reason?: ManagementReason): string {
  if (reason === "ROLE_REQUIRED") return "Esta cuenta no tiene permisos para administrar el recurso."
  if (reason === "INVALID_BILLING_EVIDENCE") return "No pudimos verificar el acceso de esta cuenta. Intenta actualizar o contacta a soporte."
  return "Esta división no está incluida en el acceso actual. Revisa tu plan para administrarla."
}

export default function BillingPaywall({ resourceName, reason }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={resourceName} onBack={() => router.back()} />
      <View style={{ flex: 1, justifyContent: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, gap: Gap.lg, alignItems: "center" }}>
          <View style={{ width: 56, height: 56, borderRadius: Radius.full, backgroundColor: Palette.warning10, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="lock-outline" size={28} color={Palette.warning} />
          </View>
          <View style={{ gap: Gap.sm }}>
            <Text style={{ color: Palette.text, fontSize: 20, fontFamily: Fonts.display, textAlign: "center" }}>Administración no disponible</Text>
            <Text style={{ color: Palette.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: Fonts.sans, textAlign: "center" }}>{blockedMessage(reason)}</Text>
          </View>
          {reason !== "ROLE_REQUIRED" && reason !== "INVALID_BILLING_EVIDENCE" ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={() => router.push("/(drawer)/account/billing")}
              style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingHorizontal: Pad.lg, paddingVertical: Pad.md }}
            >
              <MaterialIcons name="workspace-premium" size={19} color={Palette.black} />
              <Text style={{ color: Palette.black, fontSize: 14, fontFamily: Fonts.semiBold }}>Ver planes</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  )
}
