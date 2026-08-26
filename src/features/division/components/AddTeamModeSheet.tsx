import { Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useState } from "react"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"

interface TeamItem {
  id: string
  nombre: string
}

interface Props {
  visible: boolean
  assignedTeams: TeamItem[]
  onAddNew: () => void
  onReplace: (teamId: string) => void
  onClose: () => void
}

export default function AddTeamModeSheet({ visible, assignedTeams, onAddNew, onReplace, onClose }: Props) {
  const [selectingTeam, setSelectingTeam] = useState(false)

  const option = (icon: keyof typeof MaterialIcons.glyphMap, title: string, subtitle: string, onPress: () => void) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.base, borderRadius: Radius.lg, backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.border }}
    >
      <View style={{ width: 40, height: 40, borderRadius: Radius.full, alignItems: "center", justifyContent: "center", backgroundColor: Palette.cyan10 }}>
        <MaterialIcons name={icon} size={22} color={Palette.cyan} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17 }}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={Palette.textMuted} />
    </TouchableOpacity>
  )

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={selectingTeam ? "Equipo a reemplazar" : "Agregar equipo"}
      snapPoints={[selectingTeam ? "75%" : "42%"]}
    >
      {/* La hoja ya es scrollable; una lista RN anidada rompería el gesto. */}
      <View style={{ gap: Gap.sm }}>
        {selectingTeam ? (
          <>
            <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: Gap.sm }}>
              Selecciona el equipo actual. Después escanea el QR de quien ocupará su lugar.
            </Text>
            {assignedTeams.map((team) => (
              <TouchableOpacity
                key={team.id}
                activeOpacity={0.7}
                onPress={() => onReplace(team.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.border }}
              >
                <MaterialIcons name="groups" size={21} color={Palette.cyan} />
                <Text style={{ flex: 1, color: Palette.text, fontFamily: Fonts.medium, fontSize: 14 }}>{team.nombre}</Text>
                <MaterialIcons name="qr-code-scanner" size={20} color={Palette.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setSelectingTeam(false)} style={{ alignItems: "center", paddingVertical: Pad.md }}>
              <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 14 }}>Volver</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {option("group-add", "Agregar equipo nuevo", "Incorpora otro equipo a la división mediante su QR.", onAddNew)}
            {option("published-with-changes", "Reemplazar equipo existente", "Conserva la competencia y cambia al equipo que la ocupa.", () => setSelectingTeam(true))}
          </>
        )}
      </View>
    </AppBottomSheetModal>
  )
}
