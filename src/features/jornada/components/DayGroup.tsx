import { View, Text } from "react-native"
import { Gap, Pad, Palette, Fonts } from "@/constants/theme"
import PartidoCard from "./PartidoCard"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"

const DIA_NOMBRES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

interface Props {
  dateKey: string
  partidos: PartidoResponse[]
  onPartidoPress: (partido: PartidoResponse) => void
}

export default function DayGroup({ dateKey, partidos, onPartidoPress }: Props) {
  let fechaFormateada = ""
  let diaNombre = ""
  if (dateKey !== "sin-fecha") {
    const [y, m, d] = dateKey.split("-").map(Number)
    fechaFormateada = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
    diaNombre = DIA_NOMBRES_FULL[new Date(y, m - 1, d).getDay()]
  }
  return (
    <View style={{ gap: Gap.sm }}>
      {dateKey !== "sin-fecha" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingTop: Pad.sm }}>
          <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.textMuted }}>{fechaFormateada}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Palette.border }} />
          <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.warning }}>{diaNombre}</Text>
        </View>
      ) : null}
      {partidos.map((p) => (
        <PartidoCard key={p.id} partido={p} onPress={onPartidoPress} />
      ))}
    </View>
  )
}
