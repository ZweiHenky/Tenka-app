import { useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native"
import { router, useLocalSearchParams, useIsFocused } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import type { TourStep } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useTeam } from "@/features/team/hooks/useTeams"
import { divisionApi } from "@/features/division/api/divisions"
import DivisionRosterGroups from "@/features/jugador/components/DivisionRosterGroups"
import { useDivisionJugadores } from "@/features/jugador/hooks/useJugadores"
import DivisionTeamInfoCard from "@/features/team/components/DivisionTeamInfoCard"
import { useQuery } from "@tanstack/react-query"
import { authClient } from "@/infrastructure/auth/client"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { useNavGuard } from "@/shared/hooks/useNavGuard"

export default function TeamDivisionPlayersScreen() {
  const guard = useNavGuard()
  const { id: equipoId, divisionId } = useLocalSearchParams<{ id: string; divisionId: string }>()
  const { data: team, isLoading: loadingTeam, error: teamError, refetch: refetchTeam } = useTeam(equipoId)
  const { data: division, isLoading: loadingDivision, error: divisionError, refetch: refetchDivision } = useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId!),
    enabled: !!divisionId,
  })
  const { data: habilitados = [], isLoading: loadingHabilitados, refetch: refetchHabilitados } = useDivisionJugadores(divisionId, equipoId)
  const [refreshing, setRefreshing] = useState(false)

  const divisionCardRef = useRef<any>(null)
  const habSectionRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const tourStartedRef = useRef(false)
  const [habSectionReady, setHabSectionReady] = useState(false)

  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { data: session } = authClient.useSession()
  const { startTour } = useTourGuide()

  const tourLoading = loadingTeam || loadingDivision
  const tourError = teamError || divisionError

  useEffect(() => {
    if (!isFocused || tourLoading || tourError || !team || !division || !session?.user) return
    if (tourStartedRef.current) return
    if (!divisionCardRef.current || !habSectionRef.current || !habSectionReady) return
    const init = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:team-division-players-v1")
      if (seen === "completed") { tourStartedRef.current = true; return }
      tourStartedRef.current = true
      const habStep: TourStep = habilitados.length > 0
        ? {
            id: "division-habilitados",
            targetRef: habSectionRef,
            title: "Plantilla habilitada",
            description: "Consulta los jugadores del equipo habilitados para participar en esta división.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          }
        : {
            id: "division-habilitados",
            targetRef: habSectionRef,
            title: "Plantilla habilitada",
            description: "Aún no hay jugadores habilitados en esta división.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          }
      startTour(
        [
          {
            id: "division-info",
            targetRef: divisionCardRef,
            title: "Identifica la competencia",
            description: "Revisa la liga y el estado de la división donde participa tu equipo.",
            spotlightPadding: 8,
            tooltipPosition: "bottom",
          },
          habStep,
        ],
        {
          tourId: "team-division-players-v1",
          insets: { top: insets.top, bottom: insets.bottom },
          nextButtonText: "Siguiente",
          prevButtonText: "Atrás",
          skipButtonText: "Saltar",
          doneButtonText: "Entendido",
          onTourEnd: () => { AsyncStorage.setItem("@tour_guide:team-division-players-v1", "completed") },
          tooltipStyles: {
            backgroundColor: Palette.surface,
            titleColor: Palette.text,
            descriptionColor: Palette.textSecondary,
            buttonTextColor: Palette.black,
            primaryButtonColor: Palette.cyan,
            skipButtonColor: Palette.textMuted,
            borderRadius: Radius.lg,
          },
          spotlightStyles: { overlayColor: Palette.black, overlayOpacity: 0.7 },
          scrollRef,
          getCurrentScrollOffset: () => scrollOffsetRef.current,
        }
      )
    }
    init()
  }, [isFocused, tourLoading, tourError, team, division, session?.user, habilitados.length, habSectionReady, startTour, insets.top, insets.bottom])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchTeam(), refetchDivision(), refetchHabilitados()])
    } finally {
      setRefreshing(false)
    }
  }

  const loading = loadingTeam || loadingDivision
  const error = teamError || divisionError

  if (loading) return <LoadingScreen />

  if (error || !team || !division) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="División" />
        <ErrorState message={error ? (error as Error).message : "No se encontró la división"} onRetry={handleRefresh} fullScreen />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={team.nombre} />
      <PullToRefresh scrollRef={scrollRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }} refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <View ref={divisionCardRef}>
            <DivisionTeamInfoCard team={team} division={division} />
          </View>

          {division.liga?.id ? (
            <TouchableOpacity onPress={() => guard(() => router.push({ pathname: "/(drawer)/(public)/liga/[id]", params: { id: division.liga!.id, divisionId } }))} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm, minHeight: 42, backgroundColor: Palette.cyan10, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.cyan20 }}>
              <MaterialIcons name="visibility" size={18} color={Palette.cyan} />
              <Text style={{ color: Palette.cyan, fontFamily: Fonts.medium, fontSize: 13 }}>Ver liga pública</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Plantilla de la división ({habilitados.length})
          </Text>

          {loadingHabilitados ? (
            <ActivityIndicator color={Palette.cyan} />
          ) : (
            <View ref={habSectionRef} onLayout={() => setHabSectionReady(true)}>
              <DivisionRosterGroups players={habilitados} onPlayerPress={(playerId) => guard(() => router.push({ pathname: "/(drawer)/(public)/jugador/[id]", params: { id: playerId } }))} />
            </View>
          )}
        </View>
      </PullToRefresh>

    </View>
  )
}
