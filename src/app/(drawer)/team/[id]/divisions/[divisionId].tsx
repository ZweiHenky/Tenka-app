import { useMemo, useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native"
import { router, useLocalSearchParams, useIsFocused } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useTeam } from "@/features/team/hooks/useTeams"
import { divisionApi } from "@/features/division/api/divisions"
import { useAssignJugadorToDivision, useDivisionJugadores, useJugadores, useRemoveJugadorFromDivision } from "@/features/jugador/hooks/useJugadores"
import { POSICIONES_JUGADOR, type Jugador } from "@/domain/interfaces/player"
import { useQuery } from "@tanstack/react-query"
import { authClient } from "@/infrastructure/auth/client"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import PullToRefresh from "@/shared/components/PullToRefresh"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((p) => p.id === posicion)?.nombre ?? posicion
}

function dorsalFor(jugador: Jugador) {
  return jugador.equipos?.[0]?.dorsal
}

export default function TeamDivisionPlayersScreen() {
  const { id: equipoId, divisionId } = useLocalSearchParams<{ id: string; divisionId: string }>()
  const { data: team, isLoading: loadingTeam, error: teamError, refetch: refetchTeam } = useTeam(equipoId)
  const { data: division, isLoading: loadingDivision, error: divisionError, refetch: refetchDivision } = useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId!),
    enabled: !!divisionId,
  })
  const { data: plantilla = [], isLoading: loadingPlantilla, refetch: refetchPlantilla } = useJugadores(equipoId)
  const { data: habilitados = [], isLoading: loadingHabilitados, refetch: refetchHabilitados } = useDivisionJugadores(divisionId, equipoId)
  const assign = useAssignJugadorToDivision()
  const remove = useRemoveJugadorFromDivision()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingAssignId, setLoadingAssignId] = useState<string | null>(null)

  const divisionCardRef = useRef<any>(null)
  const addPlayerBtnRef = useRef<any>(null)
  const habSectionRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const tourStartedRef = useRef(false)
  const [habSectionReady, setHabSectionReady] = useState(false)

  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { data: session } = authClient.useSession()
  const { startTour, endTour } = useTourGuide()

  useEffect(() => {
    if (pickerOpen) endTour()
  }, [pickerOpen, endTour])

  const tourLoading = loadingTeam || loadingDivision
  const tourError = teamError || divisionError

  useEffect(() => {
    if (!isFocused || tourLoading || tourError || !team || !division || !session?.user || pickerOpen) return
    if (tourStartedRef.current) return
    if (!divisionCardRef.current || !addPlayerBtnRef.current || !habSectionRef.current || !habSectionReady) return
    const init = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:team-division-players-v1")
      if (seen === "completed") { tourStartedRef.current = true; return }
      tourStartedRef.current = true
      const habStep = habilitados.length > 0
        ? {
            id: "division-habilitados",
            targetRef: habSectionRef,
            title: "Plantilla habilitada",
            description: "Usa el icono rojo para retirar a un jugador de esta división. No se elimina de tu equipo.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          }
        : {
            id: "division-habilitados",
            targetRef: habSectionRef,
            title: "Plantilla habilitada",
            description: "Aún no hay jugadores habilitados. Agrega jugadores desde el botón de arriba.",
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
          {
            id: "division-add-player",
            targetRef: addPlayerBtnRef,
            title: "Habilita jugadores",
            description: "Solo se muestran los jugadores registrados en tu plantilla del equipo.",
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
  }, [isFocused, tourLoading, tourError, team, division, session?.user, pickerOpen, habilitados.length, habSectionReady, startTour, endTour, insets.top, insets.bottom])

  const enabledIds = useMemo(() => new Set(habilitados.map((j) => j.jugadorId)), [habilitados])
  const availablePlayers = useMemo(() => plantilla.filter((j) => !enabledIds.has(j.id)), [enabledIds, plantilla])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchTeam(), refetchDivision(), refetchPlantilla(), refetchHabilitados()])
    } finally {
      setRefreshing(false)
    }
  }

  const handleAssign = async (jugadorId: string) => {
    setLoadingAssignId(jugadorId)
    try {
      await assign.mutateAsync({ divisionId: divisionId!, equipoId: equipoId!, jugadorId })
      setPickerOpen(false)
    } finally {
      setLoadingAssignId(null)
    }
  }

  const handleRemove = (jugadorId: string) => {
    remove.mutate({ divisionId: divisionId!, equipoId: equipoId!, jugadorId })
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
      <CustomHeader title="Jugadores división" />
      <PullToRefresh scrollRef={scrollRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }} refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <View ref={divisionCardRef} style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.sm }}>
            <Text style={{ color: Palette.text, fontFamily: Fonts.displayBold, fontSize: 20 }}>{division.nombre}</Text>
            <Text style={{ color: Palette.textMuted, fontSize: 13 }}>{division.liga?.nombre ?? "Liga"} · {team.nombre}</Text>
            {division.estadoLiga?.nombre ? (
              <View style={{ alignSelf: "flex-start", backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
                <Text style={{ color: Palette.cyan, fontSize: 11, fontFamily: Fonts.semiBold }}>{division.estadoLiga.nombre}</Text>
              </View>
            ) : null}
            {division.liga?.id ? (
              <TouchableOpacity onPress={() => router.push({ pathname: "/(drawer)/(public)/liga/[id]", params: { id: division.liga!.id, divisionId } })} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, marginTop: Pad.sm }}>
                <MaterialIcons name="visibility" size={18} color={Palette.cyan} />
                <Text style={{ color: Palette.cyan, fontFamily: Fonts.medium, fontSize: 13 }}>Ver liga pública</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Habilitados ({habilitados.length})
            </Text>
            <TouchableOpacity ref={addPlayerBtnRef} onPress={() => setPickerOpen(true)} style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingHorizontal: Pad.md, paddingVertical: Pad.sm }}>
              <Text style={{ color: Palette.black, fontSize: 12, fontFamily: Fonts.semiBold }}>Agregar jugador</Text>
            </TouchableOpacity>
          </View>

          {loadingPlantilla || loadingHabilitados ? (
            <ActivityIndicator color={Palette.cyan} />
          ) : habilitados.length === 0 ? (
            <View ref={habSectionRef} onLayout={() => setHabSectionReady(true)}>
              <EmptyState message="No hay jugadores habilitados en esta división" icon="groups" />
            </View>
          ) : (
            <View style={{ gap: Gap.sm }}>
              {habilitados.map((row, i) => {
                const jugador = row.jugador
                const fromPlantilla = plantilla.find((j) => j.id === jugador.id)
                const dorsal = fromPlantilla ? dorsalFor(fromPlantilla) : undefined
                const card = (
                  <View key={row.jugadorId} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm }}>
                    <Image source={jugador.foto ? { uri: jugador.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 48, height: 48, borderRadius: 24 }} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{jugador.nombre}</Text>
                      <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(jugador.posicion)} · #{dorsal ?? "-"}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemove(row.jugadorId)} style={{ padding: Pad.sm }}>
                      <MaterialIcons name="remove-circle-outline" size={22} color={Palette.danger} />
                    </TouchableOpacity>
                  </View>
                )
                if (i === 0) {
                  return <View key={row.jugadorId} ref={habSectionRef} onLayout={() => setHabSectionReady(true)}>{card}</View>
                }
                return card
              })}
            </View>
          )}
        </View>
      </PullToRefresh>

      <AppBottomSheetModal visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Agregar jugador" snapPoints={["75%"]}>
            {availablePlayers.length === 0 ? (
              <Text style={{ color: Palette.textMuted, fontSize: 13 }}>Todos los jugadores del equipo ya están habilitados en esta división.</Text>
            ) : (
              <View style={{ gap: Gap.sm }}>
                  {availablePlayers.map((j) => (
                    <TouchableOpacity key={j.id} onPress={() => handleAssign(j.id)} activeOpacity={0.75} disabled={loadingAssignId === j.id} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm, opacity: loadingAssignId === j.id ? 0.5 : 1 }}>
                      <Image source={j.foto ? { uri: j.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>{j.nombre}</Text>
                        <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(j.posicion)} · #{dorsalFor(j) ?? "-"}</Text>
                      </View>
                      {loadingAssignId === j.id ? (
                        <ActivityIndicator size="small" color={Palette.cyan} />
                      ) : (
                        <MaterialIcons name="add-circle-outline" size={22} color={Palette.cyan} />
                      )}
                    </TouchableOpacity>
                  ))}
              </View>
            )}
            <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, borderRadius: Radius.md, padding: Pad.md, alignItems: "center" }}>
              <Text style={{ color: Palette.danger, fontFamily: Fonts.medium }}>Cancelar</Text>
            </TouchableOpacity>
      </AppBottomSheetModal>
    </View>
  )
}
