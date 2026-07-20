import { useState, useCallback, useRef, useEffect } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { router, useIsFocused } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import { api } from "@/infrastructure/api/client"
import { useUserLeagues, useCreateLeague, useUpdateLeague, useDeleteLeague } from "@/features/league/hooks/useLeagues"
import { useLookups } from "@/features/league/hooks/useLookups"
import { authClient } from "@/infrastructure/auth/client"
import LeagueCard from "@/features/league/components/LeagueCard"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { AuthGate } from "@/shared/components/AuthGate"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { useToast } from "@/shared/components/Toast"

export default function LeaguesScreen() {
  const toast = useToast()
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id ?? ""
  const { data: leagues = [], isLoading, error, refetch } = useUserLeagues(userId)
  const deleteLeague = useDeleteLeague()
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string; divisionCount: number } | null>(null)
  const [checkingDelete, setCheckingDelete] = useState(false)

  const createBtnRef = useRef<any>(null)
  const detailBtnRef = useRef<any>(null)
  const editBtnRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const createTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const createTourStartedRef = useRef(false)
  const manageTourStartedRef = useRef(false)
  const [firstCardReady, setFirstCardReady] = useState(false)

  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { startTour, endTour } = useTourGuide()

  const blocked = checkingDelete || deleteTarget !== null

  useEffect(() => {
    if (blocked) endTour()
  }, [blocked, endTour])

  useEffect(() => {
    if (!isFocused || isLoading || error || blocked) return
    if (leagues.length === 0) {
      if (createTourStartedRef.current) return
      const init = async () => {
        const seen = await AsyncStorage.getItem("@tour_guide:league-create-v1")
        if (seen === "completed") { createTourStartedRef.current = true; return }
        if (!createBtnRef.current) return
        createTimerRef.current = setTimeout(() => {
          createTourStartedRef.current = true
          startTour(
            [
              {
                id: "league-create",
                targetRef: createBtnRef,
                title: "Crea tu primera liga",
                description: "Crea una liga para registrar divisiones, equipos, jornadas y resultados.",
                spotlightPadding: 8,
                tooltipPosition: "bottom",
              },
            ],
            {
              tourId: "league-create-v1",
              insets: { top: insets.top, bottom: insets.bottom },
              nextButtonText: "Siguiente",
              prevButtonText: "Atrás",
              skipButtonText: "Saltar",
              doneButtonText: "Entendido",
              onTourEnd: () => { AsyncStorage.setItem("@tour_guide:league-create-v1", "completed") },
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
            }
          )
        }, 600)
      }
      init()
    } else {
      if (manageTourStartedRef.current) return
      const init = async () => {
        const seen = await AsyncStorage.getItem("@tour_guide:league-management-v1")
        if (seen === "completed") { manageTourStartedRef.current = true; return }
        if (!detailBtnRef.current || !editBtnRef.current || !firstCardReady) return
        manageTimerRef.current = setTimeout(() => {
          manageTourStartedRef.current = true
          startTour(
            [
              {
                id: "league-detail",
                targetRef: detailBtnRef,
                title: "Administra tu liga",
                description: "Toca una liga para administrar sus divisiones y consultar su información.",
                spotlightPadding: 8,
                tooltipPosition: "bottom",
              },
              {
                id: "league-edit",
                targetRef: editBtnRef,
                title: "Actualiza tu liga",
                description: "Modifica el nombre, ubicación, descripción e imágenes de tu liga.",
                spotlightPadding: 8,
                tooltipPosition: "top",
              },
            ],
            {
              tourId: "league-management-v1",
              insets: { top: insets.top, bottom: insets.bottom },
              nextButtonText: "Siguiente",
              prevButtonText: "Atrás",
              skipButtonText: "Saltar",
              doneButtonText: "Entendido",
              onTourEnd: () => { AsyncStorage.setItem("@tour_guide:league-management-v1", "completed") },
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
        }, 600)
      }
      init()
    }
    return () => {
      if (createTimerRef.current) clearTimeout(createTimerRef.current)
      if (manageTimerRef.current) clearTimeout(manageTimerRef.current)
    }
  }, [isFocused, isLoading, error, leagues.length, startTour, endTour, insets.top, insets.bottom, blocked, firstCardReady])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleDelete = async (id: string, nombre: string) => {
    setCheckingDelete(true)
    try {
      const divisions = await api.get(`/api/divisiones/por-liga/${id}`).then((r) => r.data.data ?? []).catch(() => [])
      setDeleteTarget({ id, nombre, divisionCount: divisions.length })
    } catch {
      setDeleteTarget({ id, nombre, divisionCount: 0 })
    } finally {
      setCheckingDelete(false)
    }
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteLeague.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Liga eliminada")
        setDeleteTarget(null)
      },
      onError: (e) => {
        toast.error(e.message || "Error al eliminar")
        setDeleteTarget(null)
      },
    })
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader
          title="Ligas"
          rightActions={[{ icon: "add", onPress: () => router.push({ pathname: "/(drawer)/leagues/league-form" }), bg: Palette.cyan, color: Palette.black, ref: createBtnRef }]}
        />
        <LoadingScreen />
      </View>
    )
  }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader
          title="Ligas"
          rightActions={[{ icon: "add", onPress: () => router.push({ pathname: "/(drawer)/leagues/league-form" }), bg: Palette.cyan, color: Palette.black, ref: createBtnRef }]}
        />
        <PullToRefresh scrollRef={scrollRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }} onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ paddingHorizontal: Pad.xl, paddingTop: Gap.base, paddingBottom: 48, gap: Gap.md }}>
          {error ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : leagues.length === 0 ? (
            <EmptyState message="No hay ligas registradas" icon="emoji-events" />
          ) : (
            leagues.map((l, i) => {
              const card = (
                <LeagueCard
                  key={l.id}
                  id={l.id}
                  nombre={l.nombre}
                  logo={l.logo}
                  detailButtonRef={i === 0 ? detailBtnRef : undefined}
                  editButtonRef={i === 0 ? editBtnRef : undefined}
                  onPress={(id) => router.push(`/(drawer)/leagues/${id}`)}
                  onEdit={(id) => router.push({ pathname: "/(drawer)/leagues/league-form", params: { leagueId: id } })}
                  onDelete={(id, nombre) => handleDelete(id, nombre)}
                />
              )
              if (i === 0) {
                return <View key={l.id} onLayout={() => setFirstCardReady(true)}>{card}</View>
              }
              return card
            })
          )}
          </View>
        </PullToRefresh>

        <ConfirmationModal
          visible={!checkingDelete && deleteTarget !== null}
          title="Eliminar liga"
          message={
            deleteTarget && deleteTarget.divisionCount > 0
              ? `"${deleteTarget.nombre}" tiene ${deleteTarget.divisionCount} división(es). Al eliminarla se perderán todos los datos asociados. ¿Eliminar de todas formas?`
              : `¿Eliminar "${deleteTarget?.nombre}"?`
          }
          highlightText={deleteTarget?.nombre}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleteLeague.isPending}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />

        {checkingDelete ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Palette.overlay, justifyContent: "center", alignItems: "center" }}>
            <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, flexDirection: "row", alignItems: "center", gap: Gap.base }}>
              <ActivityIndicator color={Palette.cyan} />
              <Text style={{ color: Palette.text, fontSize: 15 }}>Verificando divisiones...</Text>
            </View>
          </View>
        ) : null}
      </View>
    </AuthGate>
  )
}
