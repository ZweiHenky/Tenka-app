import { useState } from "react"
import { ActivityIndicator, Image, Share, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { router, useIsFocused, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { POSICIONES_JUGADOR } from "@/domain/interfaces/player"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import { useJugadores } from "@/features/jugador/hooks/useJugadores"
import { useTeam } from "@/features/team/hooks/useTeams"
import TeamAchievementsList from "@/features/team/components/TeamAchievementsList"
import { useCampeonatosEquipo } from "@/features/division-campeon/hooks/useDivisionCampeon"
import TeamDetailHeaderCard from "@/features/team/components/TeamDetailHeaderCard"
import CustomHeader from "@/shared/components/CustomHeader"
import EmptyState from "@/shared/components/EmptyState"
import LogoImage from "@/shared/components/LogoImage"
import ErrorState from "@/shared/components/ErrorState"
import LoadingScreen from "@/shared/components/LoadingScreen"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { TabBar } from "@/shared/components/TabBar"
import { useHistoryAwareNavigation } from "@/shared/hooks/useHistoryAwareNavigation"
import { env } from "@/infrastructure/config/env"
import { publicAppLink } from "@/shared/utils/public-app-link"

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((item) => item.id === posicion)?.nombre ?? posicion
}

export default function PublicTeamDivisionSelectorScreen() {
  const openRoute = useHistoryAwareNavigation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [tab, setTab] = useState<"jugadores" | "divisiones" | "logros">("jugadores")
  const isFocused = useIsFocused()
  const { data: team, isLoading, error, refetch } = useTeam(id, isFocused)
  const { data: jugadores = [], isLoading: loadingPlayers, refetch: refetchPlayers } = useJugadores(id, isFocused && tab === "jugadores")
  const { data: divisionLinks = [], isLoading: loadingDivisions, error: divisionsError, refetch: refetchDivisions } = useQuery({
    queryKey: ["division-equipos", "equipo", id],
    queryFn: () => divisionEquipoApi.findByEquipo(id!),
    enabled: isFocused && tab === "divisiones" && !!id,
  })
  const { data: logros = [], isLoading: loadingLogros, error: logrosError, refetch: refetchLogros } = useCampeonatosEquipo(id, isFocused && tab === "logros")
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetch(),
        tab === "jugadores" ? refetchPlayers() : Promise.resolve(),
        tab === "divisiones" ? refetchDivisions() : Promise.resolve(),
        tab === "logros" ? refetchLogros() : Promise.resolve(),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  const handleShare = () => {
    const title = `${team?.nombre ?? "Equipo"} - Tenka`
    Share.share({ message: `${title}\n\n${publicAppLink(env.APP_ENV, `/equipo/${id}`)}`, title })
  }

  if (isLoading) return <View style={{ flex: 1, backgroundColor: Palette.black }}><CustomHeader title="Equipo" onBack={() => router.back()} /><LoadingScreen /></View>

  if (error || !team) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Equipo" onBack={() => router.back()} />
        <ErrorState message={error ? (error as Error).message : "Equipo no encontrado"} onRetry={() => refetch()} fullScreen />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={team.nombre} onBack={() => router.back()} rightActions={[{ icon: "share", onPress: handleShare }]} />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, paddingBottom: 48, gap: Gap.lg }}>
          <TeamDetailHeaderCard nombre={team.nombre} logo={team.logo} codigo={team.codigo} />

          <TabBar
            tabs={[{ key: "jugadores", label: "Jugadores" }, { key: "divisiones", label: "Divisiones" }, { key: "logros", label: "Logros" }]}
            activeTab={tab}
            onTabChange={(nextTab) => setTab(nextTab as "jugadores" | "divisiones" | "logros")}
          />

          {tab === "jugadores" ? (
            <View style={{ gap: Gap.sm }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Jugadores</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Todos los jugadores del equipo</Text>
              {loadingPlayers ? (
                <ActivityIndicator color={Palette.cyan} />
              ) : jugadores.length === 0 ? (
                <EmptyState message="Este equipo todavía no tiene jugadores" icon="groups" />
              ) : (
                jugadores.map((jugador) => {
                  const dorsal = jugador.equipos?.find((membership) => membership.equipoId === id)?.dorsal
                  return (
                    <TouchableOpacity
                      key={jugador.id}
                      activeOpacity={0.8}
                      onPress={() => openRoute(
                        { pathname: "/(public)/jugador/[id]", params: { id: jugador.id, returnTeamId: id! } },
                        "jugador/[id]",
                        { id: jugador.id },
                      )}
                      style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm }}
                    >
                       <Image source={jugador.foto ? { uri: jugador.foto } : require("@/assets/ejemplos/logo.png")} style={{ width: 48, height: 48, borderRadius: Radius.full }} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{jugador.nombre}</Text>
                        <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(jugador.posicion)} · #{dorsal ?? "-"}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })
              )}
            </View>
          ) : null}

          {tab === "logros" ? (
            <View style={{ gap: Gap.sm }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Logros</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Divisiones que ha ganado el equipo</Text>
              {loadingLogros ? (
                <ActivityIndicator color={Palette.cyan} />
              ) : logrosError ? (
                <ErrorState message={(logrosError as Error).message} onRetry={() => refetchLogros()} />
              ) : (
                <TeamAchievementsList logros={logros} />
              )}
            </View>
          ) : null}

          {tab === "divisiones" ? (
            <View style={{ gap: Gap.sm }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Divisiones del equipo</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Divisiones en las que participa el equipo</Text>
            {loadingDivisions ? (
              <ActivityIndicator color={Palette.cyan} />
            ) : divisionsError ? (
              <ErrorState message={(divisionsError as Error).message} onRetry={() => refetchDivisions()} />
            ) : divisionLinks.length === 0 ? (
              <EmptyState message="Este equipo no participa actualmente en divisiones públicas" icon="emoji-events" />
            ) : (
              divisionLinks.map((link) => {
                const division = link.division
                return (
                  <TouchableOpacity
                    key={link.divisionId}
                    activeOpacity={0.78}
                    onPress={() => openRoute(
                      { pathname: "/(public)/equipo/[id]/division/[divisionId]", params: { id, divisionId: link.divisionId } },
                      "equipo/[id]/division/[divisionId]",
                      { id: id!, divisionId: link.divisionId },
                    )}
                    style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
                  >
                    <LogoImage uri={division?.liga?.logo} size={46} backgroundColor={Palette.surfaceLight} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15, flexShrink: 1 }} numberOfLines={1}>{division?.nombre ?? link.divisionId}</Text>
                        {/* El palmarés: esta fila ya nombra la liga, así que el título se lee completo. */}
                        {division?.campeones?.some((titulo) => titulo.equipoId === id) ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Palette.warning10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
                            <MaterialIcons name="workspace-premium" size={12} color={Palette.warning} />
                            <Text style={{ color: Palette.warning, fontSize: 10, fontFamily: Fonts.semiBold }}>Campeón</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ color: Palette.textMuted, fontSize: 12 }} numberOfLines={1}>
                        {division?.liga?.nombre ?? "Liga"}{division?.categoria?.nombre ? ` · ${division.categoria.nombre}` : ""}
                      </Text>
                    </View>
                    {division?.estadoLiga?.nombre ? (
                      <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
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
    </View>
  )
}
