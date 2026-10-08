import { MaterialIcons } from "@expo/vector-icons"
import { router } from "expo-router"
import { Text, TouchableOpacity, View } from "react-native"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import type { ManagementReason } from "@/domain/interfaces/league"
import CustomHeader from "@/shared/components/CustomHeader"

interface Props {
  resourceName: string
  reason?: ManagementReason
  onViewPublic?: () => void
}

export default function BillingReadOnlyState({ resourceName, reason, onViewPublic }: Props) {
  const detail = reason === "LOCAL_GRACE"
    ? "El acceso está en periodo de gracia. Puedes consultar la información, pero no crear recursos ni cambiar la competencia."
    : "Los datos siguen disponibles, pero este recurso ya no tiene acceso administrativo."

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={resourceName} onBack={() => router.back()} />
      <View style={{ flex: 1, justifyContent: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, gap: Gap.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 48, height: 48, borderRadius: Radius.full, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="visibility" size={24} color={Palette.cyan} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: Palette.text, fontSize: 18, fontFamily: Fonts.display }}>Modo de solo lectura</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans }}>{detail}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: Gap.md }}>
            {onViewPublic ? (
              <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={onViewPublic} style={{ flex: 1, alignItems: "center", borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingVertical: Pad.md }}>
                <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Ver información</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={() => router.push("/(drawer)/account/billing")} style={{ flex: 1, alignItems: "center", borderRadius: Radius.md, backgroundColor: Palette.cyan, paddingVertical: Pad.md }}>
              <Text style={{ color: Palette.black, fontSize: 14, fontFamily: Fonts.semiBold }}>Revisar plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}
