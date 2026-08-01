import { View, Text } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Gap, Fonts, Pad } from "@/constants/theme"
import PlayoffRoundsAccordion from "@/features/ronda-playoff/components/PlayoffRoundsAccordion"
import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"
import type { PartidoResponse } from "@/features/partido/api/partidos"

interface Props {
  rondas: RondaPlayoff[]
  onPartidoPress: (partido: PartidoResponse) => void
}

export default function EliminatoriasTab({ rondas, onPartidoPress }: Props) {
  return (
    <View style={{ gap: Gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
        <MaterialIcons name="emoji-events" size={20} color={Palette.cyan} />
        <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Eliminatorias</Text>
      </View>
      <PlayoffRoundsAccordion
        rondas={rondas}
        onPartidoPress={onPartidoPress}
      />
    </View>
  )
}
