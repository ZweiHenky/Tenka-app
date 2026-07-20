import { useState } from "react"
import { View, Text, Image, ActivityIndicator, TouchableOpacity } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useTeam } from "@/features/team/hooks/useTeams"
import { useDivisionJugadores, useJugadores } from "@/features/jugador/hooks/useJugadores"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import { POSICIONES_JUGADOR } from "@/domain/interfaces/player"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import PullToRefresh from "@/shared/components/PullToRefresh"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((p) => p.id === posicion)?.nombre ?? posicion
}

export default function PublicTeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: team, isLoading, error, refetch } = useTeam(id)
  const { data: jugadores = [], isLoading: loadingPlayers } = useJugadores(id)
  const { data: divisionLinks = [], isLoading: loadingDivisionLinks, refetch: refetchDivisionLinks } = useQuery({
    queryKey: ["division-equipos", "equipo", id],
    queryFn: () => divisionEquipoApi.findByEquipo(id!),
    enabled: !!id,
  })
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<"jugadores" | "ligas">("jugadores")
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const selectedDivision = divisionLinks.find((link) => link.divisionId === selectedDivisionId)?.division
  const { data: divisionPlayers = [], isLoading: loadingDivisionPlayers } = useDivisionJugadores(selectedDivisionId ?? undefined, selectedDivisionId ? id : undefined)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetch(), refetchDivisionLinks()])
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading) return <LoadingScreen />

  if (error || !team) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Equipo" />
        <ErrorState message={error ? (error as Error).message : "Equipo no encontrado"} onRetry={() => refetch()} fullScreen />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Información" />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 100, height: 100, borderRadius: Radius.full, overflow: "hidden", borderWidth: 2, borderColor: Palette.cyan, backgroundColor: Palette.surfaceLight }}>
              <Image source={team.logo ? { uri: team.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 100, height: 100 }} resizeMode="cover" />
            </View>
            <Text style={{ color: Palette.text, fontSize: 24, fontFamily: Fonts.displayBold, textAlign: "center" }}>{team.nombre}</Text>
          </View>

          <View style={{ flexDirection: "row", backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setTab("jugadores")} style={{ flex: 1, paddingVertical: Pad.md, alignItems: "center", backgroundColor: tab === "jugadores" ? Palette.cyan : "transparent" }}>
              <Text style={{ color: tab === "jugadores" ? Palette.black : Palette.textSecondary, fontFamily: Fonts.semiBold }}>Jugadores</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setTab("ligas")} style={{ flex: 1, paddingVertical: Pad.md, alignItems: "center", backgroundColor: tab === "ligas" ? Palette.cyan : "transparent" }}>
              <Text style={{ color: tab === "ligas" ? Palette.black : Palette.textSecondary, fontFamily: Fonts.semiBold }}>Ligas</Text>
            </TouchableOpacity>
          </View>

          {tab === "jugadores" ? (
            <View style={{ gap: Gap.sm }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Jugadores ({jugadores.length})
              </Text>
              {loadingPlayers ? (
                <ActivityIndicator color={Palette.cyan} />
              ) : jugadores.length === 0 ? (
                <Text style={{ color: Palette.textMuted, fontSize: 13, textAlign: "center" }}>Este equipo no tiene jugadores.</Text>
              ) : (
                jugadores.map((j) => {
                  const dorsal = j.equipos?.[0]?.dorsal
                  return (
                    <TouchableOpacity key={j.id} activeOpacity={0.8} onPress={() => router.push({ pathname: "/(drawer)/(public)/jugador/[id]", params: { id: j.id } })} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm }}>
                      <Image source={j.foto ? { uri: j.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 44, height: 44, borderRadius: Radius.full }} resizeMode="cover" />
                      <View>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{j.nombre}</Text>
                        <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(j.posicion)} · #{dorsal ?? "-"}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })
              )}
            </View>
          ) : null}

          {tab === "ligas" ? (
            <View style={{ gap: Gap.sm }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Ligas y divisiones ({divisionLinks.length})
              </Text>
              {loadingDivisionLinks ? (
                <ActivityIndicator color={Palette.cyan} />
              ) : divisionLinks.length === 0 ? (
                <Text style={{ color: Palette.textMuted, fontSize: 13, textAlign: "center" }}>Este equipo no participa en ligas.</Text>
              ) : (
                divisionLinks.map((link) => {
                  const division = link.division
                  return (
                    <TouchableOpacity key={link.divisionId} activeOpacity={0.8} onPress={() => setSelectedDivisionId(link.divisionId)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}>
                      <View style={{ width: 46, height: 46, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.cyan20 }}>
                        <Image source={division?.liga?.logo ? { uri: division.liga.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 46, height: 46 }} resizeMode="cover" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }} numberOfLines={1}>{division?.liga?.nombre ?? "Liga"}</Text>
                        <Text style={{ color: Palette.textMuted, fontSize: 12 }} numberOfLines={1}>{division?.nombre ?? link.divisionId}</Text>
                      </View>
                      {division?.estadoLiga?.nombre ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
                          <MaterialIcons name="emoji-events" size={12} color={Palette.cyan} />
                          <Text style={{ color: Palette.cyan, fontSize: 11, fontFamily: Fonts.semiBold }}>{division.estadoLiga.nombre}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  )
                })
              )}
            </View>
          ) : null}
        </View>
      </PullToRefresh>
      <AppBottomSheetModal visible={!!selectedDivisionId} onClose={() => setSelectedDivisionId(null)} title="Jugadores" snapPoints={["60%"]}>
        <View style={{ gap: Gap.micro }}>
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.display }} numberOfLines={1}>{selectedDivision?.liga?.nombre ?? "Liga"}</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }} numberOfLines={1}>{selectedDivision?.nombre ?? "División"}</Text>
        </View>
        {loadingDivisionPlayers ? (
          <ActivityIndicator color={Palette.cyan} />
        ) : divisionPlayers.length === 0 ? (
          <Text style={{ color: Palette.textMuted, fontSize: 13, textAlign: "center", paddingVertical: Pad.lg }}>Sin jugadores asignados a esta división.</Text>
        ) : (
          <View style={{ gap: Gap.sm }}>
            {divisionPlayers.map((link) => (
              <TouchableOpacity key={link.jugadorId} activeOpacity={0.8} onPress={() => router.push({ pathname: "/(drawer)/(public)/jugador/[id]", params: { id: link.jugadorId } })} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm }}>
                <Image source={link.jugador.foto ? { uri: link.jugador.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 44, height: 44, borderRadius: Radius.full }} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }} numberOfLines={1}>{link.jugador.nombre}</Text>
                  <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(link.jugador.posicion)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </AppBottomSheetModal>
    </View>
  )
}
