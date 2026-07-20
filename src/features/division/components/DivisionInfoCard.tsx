import { View, Text } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface Props {
  etiquetas: { icon?: string; label: string; gold?: boolean }[]
  stats: { icon: string; label: string; value: string }[]
  schedule: { icon: string; label: string; text: string }[]
  children?: React.ReactNode
}

export default function DivisionInfoCard({ etiquetas, stats, schedule, children }: Props) {
  const ribbonIdx = etiquetas.findIndex((e) => e.gold)
  const leftBadges = ribbonIdx >= 0 ? etiquetas.slice(0, ribbonIdx) : etiquetas
  const ribbonItem = ribbonIdx >= 0 ? etiquetas[ribbonIdx] : null
  const belowBadges = ribbonIdx >= 0 ? etiquetas.slice(ribbonIdx + 1) : []

  return (
    <>
      <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.md, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
        <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.cyan, textTransform: "uppercase", letterSpacing: 0.5 }}>Resumen</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: -Pad.base }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm, paddingLeft: Pad.base, flex: 1 }}>
            {leftBadges.map((e, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
                {e.icon ? <MaterialIcons name={e.icon as any} size={14} color={Palette.cyan} /> : null}
                <Text style={{ fontSize: 12, fontFamily: Fonts.medium, color: Palette.text }}>{e.label}</Text>
              </View>
            ))}
          </View>
          {ribbonItem && (
            <View style={{ backgroundColor: Palette.cyan, paddingHorizontal: 14, paddingVertical: 5, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.black }}>{ribbonItem.label}</Text>
            </View>
          )}
        </View>
        {belowBadges.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
            {belowBadges.map((e, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                {e.icon ? <MaterialIcons name={e.icon as any} size={14} color={Palette.cyan} /> : null}
                <Text style={{ fontSize: 12, fontFamily: Fonts.medium, color: Palette.textSecondary }}>{e.label}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Pad.sm }}>
          {stats.map((s, i) => (
            <View key={i} style={{ alignItems: "center", gap: Gap.micro }}>
              <MaterialIcons name={s.icon as any} size={24} color={Palette.cyan} />
              <Text style={{ fontSize: 18, fontFamily: Fonts.displayBold, color: Palette.text }}>{s.value}</Text>
              <Text style={{ fontSize: 11, fontFamily: Fonts.medium, color: Palette.textMuted }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {children}

      <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.md, borderWidth: 1, borderColor: Palette.border }}>
        <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Programación</Text>
        {schedule.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Pad.sm, gap: Gap.sm }}>
            {schedule.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <MaterialIcons name={s.icon as any} size={20} color={Palette.cyan} />
                <View>
                  <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>{s.text}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </>
  )
}
