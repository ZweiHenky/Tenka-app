import { useState } from "react"
import { Image, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { BottomSheetFlatList } from "@gorhom/bottom-sheet"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { isParticipant, toggleParticipacion, type ParticipacionInput, type ScoreSide, type ScorerCandidate } from "../scoring"

interface Props {
  localName: string
  visitorName: string
  localPlayers: ScorerCandidate[]
  visitorPlayers: ScorerCandidate[]
  participaciones: ParticipacionInput[]
  onChange: (participaciones: ParticipacionInput[]) => void
  disabled?: boolean
  readOnly?: boolean
  expanded: boolean
  onToggle: () => void
  /**
   * Partidos de liga por jugador y el mínimo que la división exige para alinear en eliminatorias.
   * Se pasan **solo en partidos del cuadro**: sirven para ver quién no llega antes de intentar
   * guardar, en vez de descubrirlo con el error del servidor.
   */
  partidosPorJugador?: Record<string, number>
  minimoEliminatoria?: number
}

export default function ParticipacionEditor(props: Props) {
  const [pickerSide, setPickerSide] = useState<ScoreSide | null>(null)
  const readOnly = props.readOnly ?? false
  const blocked = props.disabled ?? false
  const total = props.participaciones.length
  const minimo = props.minimoEliminatoria ?? 0
  /** `null` cuando la división no exige mínimo: ahí no hay nada que marcar. */
  const partidosDe = (jugadorId: string): number | null =>
    minimo > 0 ? (props.partidosPorJugador?.[jugadorId] ?? 0) : null

  const toggle = (side: ScoreSide, playerId: string) => {
    props.onChange(toggleParticipacion(props.participaciones, side, playerId))
  }

  const renderSide = (side: ScoreSide, name: string, players: ScorerCandidate[]) => {
    const rows = props.participaciones.filter((item) => item.ladoMarcador === side)
    return (
      <View style={{ gap: Gap.sm, padding: Pad.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Gap.sm }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 13 }}>{name}</Text>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 11 }}>{rows.length} participante{rows.length === 1 ? "" : "s"}</Text>
          </View>
          {!readOnly ? (
            <TouchableOpacity disabled={props.disabled || players.length === 0} onPress={() => setPickerSide(side)} style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: Pad.sm, opacity: props.disabled || players.length === 0 ? 0.4 : 1 }}>
              <MaterialIcons name="person-add" size={18} color={Palette.cyan} />
              <Text style={{ color: Palette.cyan, fontFamily: Fonts.medium, fontSize: 12 }}>Jugador</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {rows.map((row) => {
          const player = players.find((item) => item.id === row.jugadorId)
          return (
            <View key={row.jugadorId} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View style={{ width: 30, height: 30, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surface }}>
                {player?.foto ? <Image source={{ uri: player.foto }} style={{ width: 30, height: 30 }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="person" size={18} color={Palette.textMuted} /></View>}
              </View>
              <Text numberOfLines={1} style={{ flex: 1, color: Palette.text, fontFamily: Fonts.medium, fontSize: 12 }}>{player?.dorsal != null ? `#${player.dorsal} ` : ""}{player?.nombre ?? "Jugador"}</Text>
              {(() => {
                const jugados = partidosDe(row.jugadorId)
                if (jugados == null || jugados >= minimo) return null
                return <Text style={{ color: Palette.danger, fontFamily: Fonts.semiBold, fontSize: 11 }}>{jugados}/{minimo}</Text>
              })()}
              {!readOnly ? (
                <TouchableOpacity accessibilityLabel={`Quitar participación a ${player?.nombre ?? "jugador"}`} disabled={props.disabled} onPress={() => toggle(side, row.jugadorId)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Palette.surface }}><MaterialIcons name="remove" size={18} color={Palette.textSecondary} /></TouchableOpacity>
              ) : null}
            </View>
          )
        })}
        {rows.length === 0 ? (
          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>Sin jugadores registrados.</Text>
        ) : null}
      </View>
    )
  }

  const pickerPlayers = pickerSide === "LOCAL" ? props.localPlayers : props.visitorPlayers
  return (
    <View style={{ gap: Gap.sm, backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: props.expanded ? Palette.cyan : Palette.border, overflow: "hidden" }}>
      <TouchableOpacity activeOpacity={0.7} onPress={props.onToggle} accessibilityRole="button" accessibilityState={{ expanded: props.expanded }} accessibilityLabel={`Participantes, ${total} registrados`} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.base }}>
        <View style={{ width: 38, height: 38, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: Palette.cyan10 }}>
          <MaterialIcons name="groups" size={20} color={Palette.cyan} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }}>Participantes</Text>
          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 11 }}>{readOnly ? "Jugadores que participaron en el partido." : "Selecciona a los jugadores que participaron en el partido."}</Text>
        </View>
        {total > 0 ? (
          <View style={{ backgroundColor: Palette.cyan, borderRadius: Radius.full, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: Palette.black }}>{total}</Text>
          </View>
        ) : null}
        <MaterialIcons name={props.expanded ? "expand-less" : "expand-more"} size={22} color={Palette.textMuted} />
      </TouchableOpacity>
      {props.expanded ? (
        <View style={{ gap: Gap.md, padding: Pad.md, paddingTop: Pad.sm, borderTopWidth: 1, borderTopColor: Palette.border }}>
          {renderSide("LOCAL", props.localName, props.localPlayers)}
          {renderSide("VISITANTE", props.visitorName, props.visitorPlayers)}
        </View>
      ) : null}
      <AppBottomSheetModal visible={pickerSide !== null && props.expanded && !blocked && !readOnly} onClose={() => setPickerSide(null)} title="Seleccionar participante" snapPoints={["60%"]} scrollable={false} stackBehavior="push">
        {/* BottomSheetFlatList, no FlatList: dentro de una hoja de @gorhom/bottom-sheet el gesto
            de scroll se lo queda la hoja y la lista no se desplaza. */}
        <BottomSheetFlatList
          style={{ flex: 1 }}
          data={pickerPlayers.filter((player) => !isParticipant(props.participaciones, pickerSide!, player.id))}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={{ color: Palette.textMuted, textAlign: "center", padding: Pad.lg }}>No hay más jugadores disponibles.</Text>}
          renderItem={({ item }) => <TouchableOpacity disabled={blocked || readOnly} onPress={() => { if (pickerSide && !blocked && !readOnly) { toggle(pickerSide, item.id); setPickerSide(null) } }} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.md, borderBottomWidth: 1, borderBottomColor: Palette.border, opacity: blocked || readOnly ? 0.4 : 1 }}><View style={{ width: 38, height: 38, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight }}>{item.foto ? <Image source={{ uri: item.foto }} style={{ width: 38, height: 38 }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="person" size={21} color={Palette.textMuted} /></View>}</View><View style={{ flex: 1 }}><Text style={{ color: Palette.text, fontFamily: Fonts.medium }}>{item.dorsal != null ? `#${item.dorsal} ` : ""}{item.nombre}</Text>{(() => { const jugados = partidosDe(item.id); if (jugados == null) return null; const alcanza = jugados >= minimo; return <Text style={{ color: alcanza ? Palette.textMuted : Palette.danger, fontFamily: Fonts.sans, fontSize: 11, marginTop: 2 }}>{alcanza ? `${jugados} partidos` : `Solo ${jugados} de ${minimo} partidos`}</Text> })()}</View><MaterialIcons name="add-circle-outline" size={21} color={Palette.cyan} /></TouchableOpacity>}
        />
      </AppBottomSheetModal>
    </View>
  )
}
