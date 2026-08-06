import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Gap, Pad, Palette, Fonts } from "@/constants/theme"
import PartidoCard from "./PartidoCard"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"

const DIA_NOMBRES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

interface Props {
  dateKey: string
  partidos: PartidoResponse[]
  expanded: boolean
  onToggle: () => void
  onPartidoPress: (partido: PartidoResponse) => void
  headerRef?: React.RefObject<any>
  onHeaderLayout?: () => void
  firstPartidoRef?: React.RefObject<any>
  onFirstPartidoLayout?: () => void
}

export default function DayGroup({ dateKey, partidos, expanded, onToggle, onPartidoPress, headerRef, onHeaderLayout, firstPartidoRef, onFirstPartidoLayout }: Props) {
  let fechaFormateada = ""
  let diaNombre = ""
  if (dateKey !== "sin-fecha") {
    const [y, m, d] = dateKey.split("-").map(Number)
    fechaFormateada = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
    diaNombre = DIA_NOMBRES_FULL[new Date(y, m - 1, d).getDay()]
  }
  const finalizados = partidos.filter((partido) => partido.estado === "FINALIZADO" || partido.estado === "SUSPENDIDO").length

  return (
    <View style={{ gap: Gap.md }}>
      <TouchableOpacity
        ref={headerRef}
        onLayout={onHeaderLayout}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${dateKey === "sin-fecha" ? "Sin fecha" : `${diaNombre} ${fechaFormateada}`}, ${finalizados} de ${partidos.length} partidos finalizados`}
        onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, paddingVertical: Pad.sm, borderBottomWidth: 1, borderBottomColor: expanded ? Palette.cyan : Palette.textMuted }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.text }}>
            {dateKey === "sin-fecha" ? "Sin fecha" : diaNombre}
          </Text>
          {dateKey !== "sin-fecha" ? (
            <Text style={{ fontSize: 12, fontFamily: Fonts.sans, color: Palette.textMuted }}>{fechaFormateada}</Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, fontFamily: Fonts.medium, color: finalizados === partidos.length ? Palette.success : Palette.textSecondary }}>
          {finalizados} de {partidos.length} finalizados
        </Text>
        <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={24} color={expanded ? Palette.cyan : Palette.textMuted} />
      </TouchableOpacity>
      {expanded ? partidos.map((p, index) => (
        <PartidoCard
          key={p.id}
          partido={p}
          onPress={onPartidoPress}
          targetRef={index === 0 ? firstPartidoRef : undefined}
          onLayout={index === 0 ? onFirstPartidoLayout : undefined}
        />
      )) : null}
    </View>
  )
}
