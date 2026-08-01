import { useState } from "react"
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useToast } from "@/shared/components/Toast"
import { useUpdateTeamSaldo } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { isValidSaldoInput, normalizeSaldoInput } from "@/features/division/utils/teamSaldo"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"

interface TeamSaldoItem {
  id: string
  nombre: string
  saldoPendiente?: string
}

interface Props {
  divisionId: string
  team: TeamSaldoItem
  onClose: () => void
}

export default function TeamSaldoEditor({ divisionId, team, onClose }: Props) {
  const toast = useToast()
  const updateSaldo = useUpdateTeamSaldo()
  const [value, setValue] = useState(team.saldoPendiente ?? "0")
  const [showError, setShowError] = useState(false)

  const save = (saldoPendiente: string) => {
    if (updateSaldo.isPending) return
    updateSaldo.mutate(
      { divisionId, equipoId: team.id, saldoPendiente },
      {
        onSuccess: () => {
          toast.success(saldoPendiente === "0" ? "Equipo marcado sin adeudo" : "Saldo pendiente actualizado")
          onClose()
        },
        onError: (error: Error) => toast.error(error.message || "No se pudo actualizar el saldo"),
      },
    )
  }

  const handleSave = () => {
    const normalized = normalizeSaldoInput(value)
    if (!isValidSaldoInput(normalized)) {
      setShowError(true)
      toast.error("Ingresa un monto no negativo con máximo 2 decimales")
      return
    }
    save(normalized)
  }

  const pending = updateSaldo.isPending

  return (
    <View style={{ backgroundColor: Palette.dark, borderWidth: 1, borderColor: Palette.cyan, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.md }}>
      <View style={{ gap: Gap.micro }}>
        <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 13 }}>Monto pendiente</Text>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: showError ? Palette.danger : Palette.border, paddingHorizontal: Pad.base }}>
          <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.semiBold, fontSize: 17 }}>$</Text>
          <TextInput
            value={value}
            onChangeText={(next) => { setValue(next); setShowError(false) }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Palette.textMuted}
            editable={!pending}
            selectTextOnFocus
            style={{ flex: 1, color: Palette.text, fontFamily: Fonts.sans, fontSize: 17, paddingHorizontal: Pad.sm, paddingVertical: Pad.md }}
          />
        </View>
        {showError ? <Text style={{ color: Palette.danger, fontFamily: Fonts.sans, fontSize: 12 }}>Usa un monto no negativo con máximo 2 decimales.</Text> : null}
      </View>
      <TouchableOpacity
        disabled={pending}
        onPress={() => save("0")}
        style={{ alignItems: "center", paddingVertical: Pad.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.cyan, opacity: pending ? 0.6 : 1 }}
      >
        <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold }}>Marcar sin adeudo</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: "row", gap: Gap.md }}>
        <TouchableOpacity
          disabled={pending}
          onPress={onClose}
          style={{ flex: 1, alignItems: "center", paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, opacity: pending ? 0.6 : 1 }}
        >
          <Text style={{ color: Palette.danger, fontFamily: Fonts.medium }}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={pending}
          onPress={handleSave}
          style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.cyan, opacity: pending ? 0.6 : 1 }}
        >
          {pending ? <ActivityIndicator color={Palette.black} /> : <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold }}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}
