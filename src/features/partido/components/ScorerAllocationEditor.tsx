import { useState } from "react"
import { Image, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { BottomSheetFlatList } from "@gorhom/bottom-sheet"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { assignedGoals, canSetAllocation, filterScorerCandidatesByParticipants, type ParticipacionInput, type ScoreSide, type ScorerAllocation, type ScorerCandidate } from "../scoring"

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
  participantes?: ParticipacionInput[]
  limitToParticipantes?: boolean
  expanded: boolean
  onToggle: () => void
}

export default function ScorerAllocationEditor(props: Props) {
  const [pickerSide, setPickerSide] = useState<ScoreSide | null>(null)
  const blocked = props.disabled ?? false
  const limitToParticipantes = props.limitToParticipantes ?? false

  const eligiblePlayers = (side: ScoreSide, players: ScorerCandidate[]) => (
    limitToParticipantes ? filterScorerCandidatesByParticipants(players, props.participantes ?? [], side) : players
  )

  const setQuantity = (side: ScoreSide, playerId: string, quantity: number, score: number) => {
    if (!canSetAllocation(props.allocations, side, playerId, quantity, score)) return
    const rest = props.allocations.filter((item) => item.ladoMarcador !== side || item.jugadorId !== playerId)
    props.onChange(quantity > 0 ? [...rest, { ladoMarcador: side, jugadorId: playerId, cantidad: quantity }] : rest)
  }

  const renderSide = (side: ScoreSide, name: string, score: number, players: ScorerCandidate[]) => {
    const rows = props.allocations.filter((item) => item.ladoMarcador === side)
    const assigned = assignedGoals(props.allocations, side)
    const eligible = eligiblePlayers(side, players)
    return (
      <View style={{ gap: Gap.sm, padding: Pad.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Gap.sm }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 13 }}>{name}</Text>
            <Text style={{ color: assigned === score ? Palette.success : Palette.warning, fontFamily: Fonts.sans, fontSize: 11 }}>Asignados {assigned} de {score}</Text>
          </View>
          <TouchableOpacity disabled={blocked || assigned >= score || eligible.length === 0} onPress={() => setPickerSide(side)} style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: Pad.sm, opacity: blocked || assigned >= score || eligible.length === 0 ? 0.4 : 1 }}>
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
              <TouchableOpacity accessibilityLabel={`Quitar gol a ${player?.nombre ?? "jugador"}`} disabled={blocked} onPress={() => setQuantity(side, row.jugadorId, row.cantidad - 1, score)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Palette.surface }}><MaterialIcons name="remove" size={18} color={Palette.textSecondary} /></TouchableOpacity>
              <Text style={{ minWidth: 18, textAlign: "center", color: Palette.text, fontFamily: Fonts.displayBold }}>{row.cantidad}</Text>
              <TouchableOpacity accessibilityLabel={`Agregar gol a ${player?.nombre ?? "jugador"}`} disabled={blocked || assigned >= score} onPress={() => setQuantity(side, row.jugadorId, row.cantidad + 1, score)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Palette.cyan10, opacity: assigned >= score ? 0.4 : 1 }}><MaterialIcons name="add" size={18} color={Palette.cyan} /></TouchableOpacity>
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

  const totalAssigned = assignedGoals(props.allocations, "LOCAL") + assignedGoals(props.allocations, "VISITANTE")
  const totalScore = Math.max(0, props.localScore) + Math.max(0, props.visitorScore)
  const pickerPlayers = pickerSide === "LOCAL" ? eligiblePlayers("LOCAL", props.localPlayers) : eligiblePlayers("VISITANTE", props.visitorPlayers)
  const selectedIds = new Set(props.allocations.filter((item) => item.ladoMarcador === pickerSide).map((item) => item.jugadorId))
  return (
    <View style={{ gap: Gap.sm, backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: props.expanded ? Palette.cyan : Palette.border, overflow: "hidden" }}>
      <TouchableOpacity activeOpacity={0.7} onPress={props.onToggle} accessibilityRole="button" accessibilityState={{ expanded: props.expanded }} accessibilityLabel={`Goleadores, ${totalAssigned} de ${totalScore} goles asignados`} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.base }}>
        <View style={{ width: 38, height: 38, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: Palette.warning10 }}>
          <MaterialIcons name="sports-soccer" size={20} color={Palette.warning} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }}>Goleadores</Text>
          <Text style={{ color: totalAssigned === totalScore ? Palette.success : Palette.warning, fontFamily: Fonts.sans, fontSize: 11 }}>{totalAssigned} de {totalScore} goles asignados</Text>
        </View>
        <MaterialIcons name={props.expanded ? "expand-less" : "expand-more"} size={22} color={Palette.textMuted} />
      </TouchableOpacity>
      {props.expanded ? (
        <View style={{ gap: Gap.md, padding: Pad.md, paddingTop: Pad.sm, borderTopWidth: 1, borderTopColor: Palette.border }}>
          {renderSide("LOCAL", props.localName, Math.max(0, props.localScore), props.localPlayers)}
          {renderSide("VISITANTE", props.visitorName, Math.max(0, props.visitorScore), props.visitorPlayers)}
        </View>
      ) : null}
      <AppBottomSheetModal visible={pickerSide !== null && props.expanded} onClose={() => setPickerSide(null)} title="Seleccionar goleador" snapPoints={["60%"]} scrollable={false} stackBehavior="push">
        {/* BottomSheetFlatList, no FlatList: dentro de una hoja de @gorhom/bottom-sheet el gesto
            de scroll se lo queda la hoja y la lista no se desplaza. */}
        <BottomSheetFlatList
          style={{ flex: 1 }}
          data={pickerPlayers.filter((player) => !selectedIds.has(player.id))}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={{ color: Palette.textMuted, textAlign: "center", padding: Pad.lg }}>{limitToParticipantes ? "Registra participantes antes de seleccionar goleadores." : "No hay más jugadores disponibles."}</Text>}
          renderItem={({ item }) => <TouchableOpacity disabled={blocked} onPress={() => { if (pickerSide && !blocked) { setQuantity(pickerSide, item.id, 1, pickerSide === "LOCAL" ? props.localScore : props.visitorScore); setPickerSide(null) } }} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.md, borderBottomWidth: 1, borderBottomColor: Palette.border, opacity: blocked ? 0.4 : 1 }}><View style={{ width: 38, height: 38, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight }}>{item.foto ? <Image source={{ uri: item.foto }} style={{ width: 38, height: 38 }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="person" size={21} color={Palette.textMuted} /></View>}</View><Text style={{ flex: 1, color: Palette.text, fontFamily: Fonts.medium }}>{item.dorsal != null ? `#${item.dorsal} ` : ""}{item.nombre}</Text><MaterialIcons name="add-circle-outline" size={21} color={Palette.cyan} /></TouchableOpacity>}
        />
      </AppBottomSheetModal>
    </View>
  )
}
