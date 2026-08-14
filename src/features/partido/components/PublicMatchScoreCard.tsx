import { Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import { formatTimeInTimeZone } from "@/shared/utils/date-time"
import type { PartidoResponse } from "../api/partidos"

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PROGRAMADO: { label: "Programado", color: Palette.cyan, bg: Palette.cyan10 },
  EN_JUEGO: { label: "En vivo", color: Palette.success, bg: Palette.success10 },
  FINALIZADO: { label: "Finalizado", color: Palette.textSecondary, bg: Palette.surfaceLight },
  SUSPENDIDO: { label: "Suspendido", color: Palette.danger, bg: Palette.danger10 },
}

function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso))
}

export default function PublicMatchScoreCard({ partido, timeZone }: { partido: PartidoResponse; timeZone: string }) {
  const status = STATUS[partido.estado ?? "PROGRAMADO"] ?? STATUS.PROGRAMADO
  const hasScore = partido.estado === "FINALIZADO" || partido.estado === "EN_JUEGO" || partido.estado === "SUSPENDIDO"
  const hasPenalties = partido.penalesLocal != null && partido.penalesVisitante != null

  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
      <View style={{ padding: Pad.base, backgroundColor: Palette.cyan10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Gap.sm }}>
        <View style={{ borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro, backgroundColor: status.bg }}>
          <Text style={{ color: status.color, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "uppercase" }}>{status.label}</Text>
        </View>
        <View style={{ borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro, backgroundColor: Palette.cyan20 }}>
          <Text style={{ color: Palette.cyan, fontSize: 11, fontFamily: Fonts.semiBold }}>{partido.tipoPartido === "AMISTOSO" ? "Amistoso" : partido.tipoPartido === "ELIMINATORIA" ? "Eliminatoria" : "Liga"}</Text>
        </View>
      </View>

      <View style={{ padding: Pad.lg, gap: Gap.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
          <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
            <LogoImage uri={partido.equipoLocal?.logo} size={68} backgroundColor={Palette.surfaceLight} ring={Palette.border} ringWidth={1} radius={Radius.lg} iconFallback="shield" />
            <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{partido.equipoLocal?.nombre ?? "Local"}</Text>
            <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>LOCAL</Text>
          </View>

          <View style={{ minWidth: 90, alignItems: "center", gap: Gap.sm }}>
            {hasScore ? (
              <Text style={{ color: Palette.text, fontSize: 38, fontFamily: Fonts.displayBold }}>{partido.golesLocal} - {partido.golesVisitante}</Text>
            ) : (
              <Text style={{ color: Palette.textMuted, fontSize: 20, fontFamily: Fonts.display }}>VS</Text>
            )}
            {hasPenalties ? <Text style={{ color: Palette.warning, fontSize: 12, fontFamily: Fonts.semiBold }}>Penales {partido.penalesLocal} - {partido.penalesVisitante}</Text> : null}
          </View>

          <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
            <LogoImage uri={partido.equipoVisitante?.logo} size={68} backgroundColor={Palette.surfaceLight} ring={Palette.border} ringWidth={1} radius={Radius.lg} iconFallback="shield" />
            <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{partido.equipoVisitante?.nombre ?? "Visitante"}</Text>
            <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>VISITANTE</Text>
          </View>
        </View>

        {partido.fecha || partido.cancha?.nombre ? (
          <View style={{ borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Pad.md, gap: Gap.sm, alignItems: "center" }}>
            {partido.fecha ? <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}><MaterialIcons name="calendar-today" size={15} color={Palette.cyan} /><Text style={{ color: Palette.textSecondary, fontSize: 12 }}>{formatDate(partido.fecha, timeZone)} · {formatTimeInTimeZone(partido.fecha, timeZone)}</Text></View> : null}
            {partido.cancha?.nombre ? <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}><MaterialIcons name="place" size={15} color={Palette.cyan} /><Text style={{ color: Palette.textSecondary, fontSize: 12 }}>{partido.cancha.nombre}</Text></View> : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}
