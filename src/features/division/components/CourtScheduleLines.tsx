import { View, Text } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Gap, Palette, Fonts } from "@/constants/theme"
import { formatDiasCortos } from "@/features/division/utils/divisionDays"
import type { CourtScheduleLine } from "@/features/division/utils/court-schedule-selection"

/**
 * Los días y el horario de cada cancha donde juega una división, todos a la vez.
 *
 * Es la forma correcta para un panel de información como `DivisionInfoSheet`, donde se viene a
 * consultar. Las vistas públicas usan `CourtSchedulePicker`: ahí la lista completa engordaría una
 * superficie pensada para hojear.
 */
export default function CourtScheduleLines({ lines }: { lines: CourtScheduleLine[] }) {
  if (lines.length === 0) return null

  return (
    <View style={{ gap: Gap.sm }}>
      {lines.map((line) => (
        <View key={line.canchaId} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
          <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="stadium" size={18} color={Palette.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {line.nombre}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>
              {formatDiasCortos(line.diasPartido)} · {line.horarioPartido}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}
