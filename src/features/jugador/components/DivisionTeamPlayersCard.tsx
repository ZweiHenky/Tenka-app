import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { POSICIONES_JUGADOR } from "@/domain/interfaces/player"
import { useAssignJugadorToDivision, useDivisionJugadores, useJugadores, useRemoveJugadorFromDivision } from "@/features/jugador/hooks/useJugadores"

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((p) => p.id === posicion)?.nombre ?? posicion
}

export default function DivisionTeamPlayersCard({ divisionId, equipoId, equipoNombre }: { divisionId: string; equipoId: string; equipoNombre: string }) {
  const { data: plantilla = [], isLoading: loadingPlantilla } = useJugadores(equipoId)
  const { data: habilitados = [], isLoading: loadingHabilitados } = useDivisionJugadores(divisionId, equipoId)
  const assign = useAssignJugadorToDivision()
  const remove = useRemoveJugadorFromDivision()
  const enabled = new Set(habilitados.map((j) => j.jugadorId))
  const loading = loadingPlantilla || loadingHabilitados

  const toggle = (jugadorId: string) => {
    if (enabled.has(jugadorId)) {
      remove.mutate({ divisionId, equipoId, jugadorId })
    } else {
      assign.mutate({ divisionId, equipoId, jugadorId })
    }
  }

  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Pad.base, paddingVertical: Pad.sm, backgroundColor: Palette.cyan10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, flex: 1 }}>
          <MaterialIcons name="groups" size={18} color={Palette.cyan} />
          <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }} numberOfLines={1}>{equipoNombre}</Text>
        </View>
        <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{enabled.size}/{plantilla.length}</Text>
      </View>

      <View style={{ padding: Pad.base, gap: Gap.sm }}>
        {loading ? (
          <ActivityIndicator size="small" color={Palette.cyan} />
        ) : plantilla.length === 0 ? (
          <Text style={{ color: Palette.textMuted, fontSize: 13 }}>Este equipo todavía no tiene jugadores.</Text>
        ) : (
          plantilla.map((j) => {
            const active = enabled.has(j.id)
            const dorsal = j.equipos?.[0]?.dorsal
            return (
              <TouchableOpacity
                key={j.id}
                onPress={() => toggle(j.id)}
                activeOpacity={0.75}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: active ? Palette.cyan10 : Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.sm, borderWidth: 1, borderColor: active ? Palette.cyan : Palette.border }}
              >
                <MaterialIcons name={active ? "check-box" : "check-box-outline-blank"} size={22} color={active ? Palette.cyan : Palette.textMuted} />
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.black, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: Palette.cyan, fontFamily: Fonts.displayBold, fontSize: 12 }}>{dorsal ?? "-"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 13 }}>{j.nombre}</Text>
                  <Text style={{ color: Palette.textMuted, fontSize: 11 }}>{formatPosicion(j.posicion)}</Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </View>
    </View>
  )
}
