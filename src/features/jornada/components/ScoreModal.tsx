import { View, Text, TouchableOpacity } from "react-native"
import { Pad, Gap, Palette, Fonts } from "@/constants/theme"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"
import PartidoResultEditor from "./PartidoResultEditor"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import type { ScorerAllocation } from "@/features/partido/scoring"

interface Props {
  partido: PartidoResponse | null
  visible: boolean
  isUpdating: boolean
  onSave: (golesLocal: number, golesVisitante: number, estado: string, anotaciones: ScorerAllocation[], penalesLocal?: number, penalesVisitante?: number, tipoPartido?: string) => void
  onClose: () => void
}

export default function ScoreModal({ partido, visible, isUpdating, onSave, onClose }: Props) {
  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} snapPoints={["75%"]}>
      <View style={{ gap: Gap.md }}>
        {partido ? (
          <PartidoResultEditor partido={partido} isUpdating={isUpdating} onSave={onSave} />
        ) : null}

        <TouchableOpacity onPress={onClose} style={{ paddingVertical: Pad.md, alignItems: "center" }}>
          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </AppBottomSheetModal>
  )
}
