import { Text, View } from "react-native"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { quotaCount, quotaIsExhausted, type AccountQuota, type QuotaResource } from "@/features/users/quota"

interface Props {
  quota?: AccountQuota
  resources: readonly QuotaResource[]
}

export default function AccountQuotaStatus({ quota, resources }: Props) {
  if (!quota) return null
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
      {resources.map((resource) => {
        const exhausted = quotaIsExhausted(quota, resource)
        return (
          <View key={resource} style={{ borderRadius: Radius.full, borderWidth: 1, borderColor: exhausted ? Palette.warning : Palette.border, backgroundColor: exhausted ? Palette.warning10 : Palette.surfaceLight, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
            <Text style={{ color: exhausted ? Palette.warning : Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 11 }}>{quotaCount(quota, resource)}</Text>
          </View>
        )
      })}
    </View>
  )
}
