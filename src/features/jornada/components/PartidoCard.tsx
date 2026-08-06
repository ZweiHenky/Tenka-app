import { TouchableOpacity, View, Text } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"
import { formatLocalTime } from "@/shared/utils/date-time"

function bordeColor(tipo: string | undefined): string {
  if (tipo === 'AMISTOSO') return Palette.success
  if (tipo === 'COMPLEMENTO') return Palette.warning
  if (tipo === 'ELIMINATORIA') return Palette.playoff
  return Palette.cyan
}

interface Props {
  partido: PartidoResponse
  onPress: (partido: PartidoResponse) => void
  targetRef?: React.RefObject<any>
  onLayout?: () => void
}

export default function PartidoCard({ partido: p, onPress, targetRef, onLayout }: Props) {
  const barColor = bordeColor(p.tipoPartido)
  const arbitros = p.arbitros?.map((arbitro) => arbitro.nombre).filter(Boolean).join(", ") ?? ""

  return (
    <TouchableOpacity
      ref={targetRef}
      onLayout={onLayout}
      onPress={() => onPress(p)}
      activeOpacity={0.7}
      style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderLeftWidth: 4, borderLeftColor: barColor, paddingVertical: Pad.sm, paddingHorizontal: Pad.base, opacity: p.estado === "FINALIZADO" ? 0.55 : 1 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
        <View style={{ width: 64, alignItems: "center", gap: 2 }}>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: Palette.text,
          }} />
          <Text style={{
            fontSize: 7, fontFamily: Fonts.semiBold,
            color: Palette.text,
          }}>{p.estado === "PROGRAMADO" ? "PROG" : p.estado}</Text>
          {p.fecha ? (
            <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>{formatLocalTime(p.fecha)}</Text>
          ) : null}
          {p.cancha?.nombre ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 2 }}>
              <MaterialIcons name="place" size={11} color={Palette.cyan} />
              <Text numberOfLines={2} style={{ color: Palette.textMuted, fontSize: 9, fontFamily: Fonts.sans, textAlign: "center", flexShrink: 1 }}>{p.cancha.nombre}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <LogoImage uri={p.equipoLocal?.logo} size={22} backgroundColor={Palette.surfaceLight} radius={Radius.sm} />
            <Text style={{ fontSize: 13, color: Palette.text, fontFamily: Fonts.medium, flexShrink: 1 }} numberOfLines={1}>{p.equipoLocal?.nombre ?? ""}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <LogoImage uri={p.equipoVisitante?.logo} size={22} backgroundColor={Palette.surfaceLight} radius={Radius.sm} />
            <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.medium, flexShrink: 1 }} numberOfLines={1}>{p.equipoVisitante?.nombre ?? ""}</Text>
          </View>
        </View>
        <View style={{ width: 50, alignItems: "center", justifyContent: "center" }}>
          {p.estado === "FINALIZADO" ? (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontFamily: Fonts.displayBold, color: Palette.text }}>{p.golesLocal}</Text>
              <View style={{ width: 20, height: 1, backgroundColor: Palette.textMuted, marginVertical: 1 }} />
              <Text style={{ fontSize: 16, fontFamily: Fonts.displayBold, color: Palette.textSecondary }}>{p.golesVisitante}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.textMuted }}>VS</Text>
          )}
        </View>
      </View>
      {arbitros ? (
        <View style={{ flexDirection: "row", gap: Gap.md, marginTop: 4, paddingLeft: 64 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MaterialIcons name="sports" size={12} color={Palette.success} />
            <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.sans }}>{arbitros}</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}
