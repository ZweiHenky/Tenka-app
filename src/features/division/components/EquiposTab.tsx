import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import ErrorState from "@/shared/components/ErrorState"
import TeamListCard from "@/features/division/components/TeamListCard"
import { Palette, Pad, Gap, Radius, Fonts } from "@/constants/theme"

interface TeamItem {
  id: string
  nombre: string
  logo: string | null
  codigo: string
  esPropio: boolean
  saldoPendiente?: string
}

interface Props {
  divisionId: string
  assignedTeams: TeamItem[]
  habilitados: string[]
  onToggleArbitraje: (id: string) => void
  onRemove: (nombre: string, equipoId: string) => void
  onManagePlayers: (equipoId: string) => void
  onAddPress: () => void
  onToggleSelectAll: () => void
  linksError: Error | null
  refetchLinks: () => void
}

export default function EquiposTab({
  divisionId,
  assignedTeams,
  habilitados,
  onToggleArbitraje,
  onRemove,
  onManagePlayers,
  onAddPress,
  onToggleSelectAll,
  linksError,
  refetchLinks,
}: Props) {
  const allSelected = assignedTeams.length > 0 && habilitados.length === assignedTeams.length

  return (
    <View style={{ gap: Gap.sm }}>
      <View style={{ flexDirection: "row", gap: Gap.sm }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Agregar equipo"
          onPress={onAddPress}
          style={{ flex: 1, minHeight: 44, borderRadius: Radius.md, backgroundColor: Palette.cyan, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm, paddingHorizontal: Pad.md }}
        >
          <MaterialIcons name="group-add" size={20} color={Palette.black} />
          <Text style={{ color: Palette.black, fontFamily: Fonts.bold, fontSize: 14 }}>Agregar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={allSelected ? "Deseleccionar todos los equipos" : "Seleccionar todos los equipos"}
          accessibilityState={{ disabled: assignedTeams.length === 0 }}
          disabled={assignedTeams.length === 0}
          onPress={onToggleSelectAll}
          style={{ flex: 1, minHeight: 44, borderRadius: Radius.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.cyan, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm, paddingHorizontal: Pad.md, opacity: assignedTeams.length === 0 ? 0.45 : 1 }}
        >
          <MaterialIcons name={allSelected ? "deselect" : "select-all"} size={20} color={Palette.cyan} />
          <Text style={{ color: Palette.cyan, fontFamily: Fonts.bold, fontSize: 14 }}>{allSelected ? "Deseleccionar" : "Seleccionar"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: Palette.textSecondary, fontSize: 12, textAlign: "center", paddingHorizontal: Pad.md, paddingTop: Pad.sm }}>
        Marca los equipos que ya pagaron el arbitraje - solo esos participarán en la próxima jornada
      </Text>
      {linksError ? (
        <ErrorState message={linksError.message} onRetry={() => refetchLinks()} />
      ) : (
        <TeamListCard
          divisionId={divisionId}
          assigned={assignedTeams}
          arbitrajePagado={habilitados ?? []}
          onRemove={onRemove}
          onToggleArbitraje={onToggleArbitraje}
          onManagePlayers={onManagePlayers}
          flat
        />
      )}
    </View>
  )
}
