import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native"
import { Palette, Fonts, Gap, Pad } from "@/constants/theme"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"

interface Props {
  visible: boolean
  onClose: () => void
  opcionesEquipos: number[]
  generateRondasIsPending: boolean
  onSelect: (n: number) => void
}

export default function PlayoffTeamSelectorModal({
  visible,
  onClose,
  opcionesEquipos,
  generateRondasIsPending,
  onSelect,
}: Props) {
  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title="¿Cuántos equipos pasan?" snapPoints={["45%"]}>
      <View style={{ alignItems: "center", gap: 20 }}>
        <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: Gap.md, paddingHorizontal: Pad.sm }}>
          {opcionesEquipos.map((n) => (
            <TouchableOpacity
              key={n}
              activeOpacity={0.7}
              onPress={() => onSelect(n)}
              disabled={generateRondasIsPending}
              style={{
                width: 80, height: 80, borderRadius: 16,
                backgroundColor: Palette.cyan,
                alignItems: "center", justifyContent: "center",
                opacity: generateRondasIsPending ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 28, fontFamily: Fonts.displayBold, color: Palette.black }}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={onClose} style={{ paddingVertical: Pad.sm }}>
          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Cancelar</Text>
        </TouchableOpacity>
        {generateRondasIsPending ? (
          <ActivityIndicator size="small" color={Palette.cyan} />
        ) : null}
      </View>
    </AppBottomSheetModal>
  )
}
