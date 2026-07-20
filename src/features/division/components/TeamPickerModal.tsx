import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import type { TimeSlotConfig } from "@/stores/divisionSchedule"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { useToast } from "@/shared/components/Toast"

interface TeamItem {
  id: string
  nombre: string
}

interface Props {
  visible: boolean
  pickingSlot: { slotId: string; side: "local" | "visitante" } | null
  slots: TimeSlotConfig[]
  assignedTeams: TeamItem[]
  onSelectTeam: (slotId: string, side: "local" | "visitante", teamId: string) => void
  onClearTeam: (slotId: string, side: "local" | "visitante") => void
  onClose: () => void
}

export default function TeamPickerModal({ visible, pickingSlot, slots, assignedTeams, onSelectTeam, onClearTeam, onClose }: Props) {
  const toast = useToast()
  const currentSlot = pickingSlot ? slots.find((s) => s.id === pickingSlot.slotId) : undefined
  const slotTipo = currentSlot?.tipo || 'regular'
  const isComplementoPuntos = slotTipo === 'complemento' && pickingSlot?.side === 'local'
  const isComplementoSinPuntos = slotTipo === 'complemento' && pickingSlot?.side === 'visitante'
  const isAmistoso = slotTipo === 'amistoso'

  const teams = assignedTeams ?? []
  const usedTeamIds = new Set<string>()
  if (pickingSlot && currentSlot) {
    if (!isComplementoSinPuntos && !isAmistoso) {
      for (const sl of slots) {
        if (sl.id === pickingSlot.slotId) continue
        if (sl.equipoLocalId) usedTeamIds.add(sl.equipoLocalId)
        if (sl.equipoVisitanteId) usedTeamIds.add(sl.equipoVisitanteId)
      }
    }
  }

  const sideLabel = slotTipo === 'complemento'
    ? (pickingSlot?.side === 'local' ? 'Puntos' : 'Sin puntos')
    : (pickingSlot?.side === 'local' ? 'Local' : 'Visitante')

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title={sideLabel} snapPoints={["70%"]}>
          <ScrollView style={{ gap: Gap.sm }}>
            <TouchableOpacity
              onPress={() => {
                if (!pickingSlot) return
                onClearTeam(pickingSlot.slotId, pickingSlot.side)
                onClose()
              }}
              style={{ backgroundColor: Palette.danger, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", marginBottom: Gap.sm }}
            >
              <Text style={{ color: Palette.white, fontWeight: "600", fontSize: 14 }}>Sin equipo</Text>
            </TouchableOpacity>
            {teams.map((t) => {
              const used = usedTeamIds.has(t.id)
              return (
                <TouchableOpacity
                  key={t.id}
                  disabled={used}
                  onPress={() => {
                    if (!pickingSlot) return
                    const slot = slots.find((s) => s.id === pickingSlot.slotId)
                    if (!slot) return
                    const isLocal = pickingSlot.side === "local"
                    const otherId = isLocal ? slot.equipoVisitanteId : slot.equipoLocalId
                    if (t.id === otherId) {
                      toast.error("Ese equipo ya está asignado al otro lado")
                      return
                    }
                    if (!isAmistoso && !isComplementoSinPuntos) {
                      const alreadyUsed = slots.some(
                        (s) => s.id !== pickingSlot.slotId && (s.equipoLocalId === t.id || s.equipoVisitanteId === t.id)
                      )
                      if (alreadyUsed) {
                        toast.error("Ese equipo ya está asignado a otro horario")
                        return
                      }
                    }
                    onSelectTeam(pickingSlot.slotId, pickingSlot.side, t.id)
                    onClose()
                  }}
                  style={{ backgroundColor: used ? Palette.black : Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.md, marginBottom: Gap.sm, borderWidth: 1, borderColor: used ? Palette.border : Palette.cyan20 }}
                >
                  <Text style={{ color: used ? Palette.textMuted : Palette.text, fontWeight: "600", fontSize: 14 }}>{t.nombre}</Text>
                </TouchableOpacity>
              )
            })}
            {teams.length === 0 ? (
              <Text style={{ color: Palette.textMuted, fontSize: 14, textAlign: "center", paddingVertical: Pad.lg }}>No hay equipos asignados a esta división</Text>
            ) : null}
            <TouchableOpacity onPress={onClose} style={{ paddingVertical: Pad.md, alignItems: "center" }}>
              <Text style={{ color: Palette.textMuted, fontWeight: "600", fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
    </AppBottomSheetModal>
  )
}
