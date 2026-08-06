import { useState } from "react"
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { assignedGoals, canSetAllocation, type ScoreSide, type ScorerAllocation, type ScorerCandidate } from "../scoring"

interface Props {
  localName: string
  visitorName: string
  localScore: number
  visitorScore: number
  localPlayers: ScorerCandidate[]
  visitorPlayers: ScorerCandidate[]
  allocations: ScorerAllocation[]
  onChange: (allocations: ScorerAllocation[]) => void
  disabled?: boolean
}

export default function ScorerAllocationEditor(props: Props) {
  const [pickerSide, setPickerSide] = useState<ScoreSide | null>(null)

  const setQuantity = (side: ScoreSide, playerId: string, quantity: number, score: number) => {
    if (!canSetAllocation(props.allocations, side, playerId, quantity, score)) return
    const rest = props.allocations.filter((item) => item.ladoMarcador !== side || item.jugadorId !== playerId)
    props.onChange(quantity > 0 ? [...rest, { ladoMarcador: side, jugadorId: playerId, cantidad: quantity }] : rest)
  }

  const renderSide = (side: ScoreSide, name: string, score: number, players: ScorerCandidate[]) => {
    const rows = props.allocations.filter((item) => item.ladoMarcador === side)
    const assigned = assignedGoals(props.allocations, side)
    return (
      <View style={{ gap: Gap.sm, padding: Pad.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Gap.sm }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 13 }}>{name}</Text>
            <Text style={{ color: assigned === score ? Palette.success : Palette.warning, fontFamily: Fonts.sans, fontSize: 11 }}>Asignados {assigned} de {score}</Text>
          </View>
          <TouchableOpacity disabled={props.disabled || assigned >= score || players.length === 0} onPress={() => setPickerSide(side)} style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: Pad.sm, opacity: props.disabled || assigned >= score || players.length === 0 ? 0.4 : 1 }}>
            <MaterialIcons name="person-add" size={18} color={Palette.cyan} />
            <Text style={{ color: Palette.cyan, fontFamily: Fonts.medium, fontSize: 12 }}>Jugador</Text>
          </TouchableOpacity>
        </View>
        {rows.map((row) => {
          const player = players.find((item) => item.id === row.jugadorId)
          return (
            <View key={row.jugadorId} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View style={{ width: 30, height: 30, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surface }}>
                {player?.foto ? <Image source={{ uri: player.foto }} style={{ width: 30, height: 30 }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="person" size={18} color={Palette.textMuted} /></View>}
              </View>
              <Text numberOfLines={1} style={{ flex: 1, color: Palette.text, fontFamily: Fonts.medium, fontSize: 12 }}>{player?.dorsal != null ? `#${player.dorsal} ` : ""}{player?.nombre ?? "Jugador"}</Text>
              <TouchableOpacity accessibilityLabel={`Quitar gol a ${player?.nombre ?? "jugador"}`} disabled={props.disabled} onPress={() => setQuantity(side, row.jugadorId, row.cantidad - 1, score)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Palette.surface }}><MaterialIcons name="remove" size={18} color={Palette.textSecondary} /></TouchableOpacity>
              <Text style={{ minWidth: 18, textAlign: "center", color: Palette.text, fontFamily: Fonts.displayBold }}>{row.cantidad}</Text>
              <TouchableOpacity accessibilityLabel={`Agregar gol a ${player?.nombre ?? "jugador"}`} disabled={props.disabled || assigned >= score} onPress={() => setQuantity(side, row.jugadorId, row.cantidad + 1, score)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Palette.cyan10, opacity: assigned >= score ? 0.4 : 1 }}><MaterialIcons name="add" size={18} color={Palette.cyan} /></TouchableOpacity>
            </View>
          )
        })}
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingTop: rows.length ? Pad.sm : 0, borderTopWidth: rows.length ? 1 : 0, borderTopColor: Palette.border }}>
          <MaterialIcons name="sports-soccer" size={16} color={Palette.textMuted} />
          <Text style={{ flex: 1, color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }}>Sin asignar (incluye autogol)</Text>
          <Text style={{ color: Palette.warning, fontFamily: Fonts.displayBold }}>{Math.max(0, score - assigned)}</Text>
        </View>
      </View>
    )
  }

  const pickerPlayers = pickerSide === "LOCAL" ? props.localPlayers : props.visitorPlayers
  const selectedIds = new Set(props.allocations.filter((item) => item.ladoMarcador === pickerSide).map((item) => item.jugadorId))
  return (
    <View style={{ gap: Gap.md }}>
      <View><Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 15 }}>Goleadores</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 11 }}>La asignación puede quedar incompleta.</Text></View>
      {renderSide("LOCAL", props.localName, Math.max(0, props.localScore), props.localPlayers)}
      {renderSide("VISITANTE", props.visitorName, Math.max(0, props.visitorScore), props.visitorPlayers)}
      <AppBottomSheetModal visible={pickerSide !== null} onClose={() => setPickerSide(null)} title="Seleccionar goleador" snapPoints={["60%"]} scrollable={false} stackBehavior="push">
        <FlatList
          data={pickerPlayers.filter((player) => !selectedIds.has(player.id))}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={{ color: Palette.textMuted, textAlign: "center", padding: Pad.lg }}>No hay más jugadores disponibles.</Text>}
          renderItem={({ item }) => <TouchableOpacity onPress={() => { if (pickerSide) setQuantity(pickerSide, item.id, 1, pickerSide === "LOCAL" ? props.localScore : props.visitorScore); setPickerSide(null) }} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.md, borderBottomWidth: 1, borderBottomColor: Palette.border }}><View style={{ width: 38, height: 38, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight }}>{item.foto ? <Image source={{ uri: item.foto }} style={{ width: 38, height: 38 }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="person" size={21} color={Palette.textMuted} /></View>}</View><Text style={{ flex: 1, color: Palette.text, fontFamily: Fonts.medium }}>{item.dorsal != null ? `#${item.dorsal} ` : ""}{item.nombre}</Text><MaterialIcons name="add-circle-outline" size={21} color={Palette.cyan} /></TouchableOpacity>}
        />
      </AppBottomSheetModal>
    </View>
  )
}
