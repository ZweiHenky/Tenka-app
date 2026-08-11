import { useState } from "react"
import { ActivityIndicator, Share, Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Fonts, Gap, Pad, Palette } from "@/constants/theme"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import DivisionRosterGroups from "@/features/jugador/components/DivisionRosterGroups"
import { useDivisionJugadores } from "@/features/jugador/hooks/useJugadores"
import DivisionTeamInfoCard from "@/features/team/components/DivisionTeamInfoCard"
import { useTeam } from "@/features/team/hooks/useTeams"
import CustomHeader from "@/shared/components/CustomHeader"
import ErrorState from "@/shared/components/ErrorState"
import LoadingScreen from "@/shared/components/LoadingScreen"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { useNavGuard } from "@/shared/hooks/useNavGuard"

export default function PublicDivisionTeamScreen() {
  const guard = useNavGuard()
  const { id, divisionId } = useLocalSearchParams<{ id: string; divisionId: string }>()
  const { data: team, isLoading: loadingTeam, error: teamError, refetch: refetchTeam } = useTeam(id)
  const { data: divisionLinks = [], isLoading: loadingDivisions, error: divisionsError, refetch: refetchDivisions } = useQuery({
    queryKey: ["division-equipos", "equipo", id],
    queryFn: () => divisionEquipoApi.findByEquipo(id!),
    enabled: !!id,
  })
  const contextLink = divisionLinks.find((link) => link.divisionId === divisionId)
  const { data: players = [], isLoading: loadingPlayers, error: playersError, refetch: refetchPlayers } = useDivisionJugadores(
    contextLink ? divisionId : undefined,
    contextLink ? id : undefined,
  )
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchTeam(), refetchDivisions(), ...(contextLink ? [refetchPlayers()] : [])])
    } finally {
      setRefreshing(false)
    }
  }

  const handleShare = () => {
    const divisionName = contextLink?.division?.nombre ?? "División"
    const title = `${team?.nombre ?? "Equipo"} · ${divisionName} - Tenka`
    Share.share({ message: `${title}\n\nhttps://tenka.studio/equipo/${id}/division/${divisionId}`, title })
  }

  if (loadingTeam || loadingDivisions) return <LoadingScreen />

  const error = teamError || divisionsError
  if (error || !team || !contextLink?.division) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Equipo" />
        <ErrorState
          message={error ? (error as Error).message : "El equipo no participa en esta división o la división no está disponible"}
          onRetry={handleRefresh}
          fullScreen
        />
      </View>
    )
  }

  const division = contextLink.division

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={team.nombre} rightActions={[{ icon: "share", onPress: handleShare }]} />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, paddingBottom: 48, gap: Gap.lg }}>
          <DivisionTeamInfoCard team={team} division={division} />

          <View style={{ gap: Gap.sm }}>
            <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Plantilla de la división ({players.length})
            </Text>
            {loadingPlayers ? (
              <ActivityIndicator color={Palette.cyan} />
            ) : playersError ? (
              <ErrorState message={(playersError as Error).message} onRetry={() => refetchPlayers()} />
            ) : (
              <DivisionRosterGroups players={players} onPlayerPress={(playerId) => guard(() => router.push({ pathname: "/(drawer)/(public)/jugador/[id]", params: { id: playerId } }))} />
            )}
          </View>
        </View>
      </PullToRefresh>
    </View>
  )
}
