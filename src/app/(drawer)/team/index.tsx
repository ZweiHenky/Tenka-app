import { useState, useCallback, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native"
import { router, useIsFocused } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import QRCode from "react-native-qrcode-svg"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import { useUserTeams, useDeleteTeam } from "@/features/team/hooks/useTeams"
import { authClient } from "@/infrastructure/auth/client"
import TeamCard from "@/features/team/components/TeamCard"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { AuthGate } from "@/shared/components/AuthGate"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import { useToast } from "@/shared/components/Toast"
import { canCreateTeam, type UserRole } from "@/domain/interfaces/user"

export default function TeamScreen() {
  const toast = useToast()
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id ?? ""
  const canCreate = canCreateTeam((session?.user as { rol?: UserRole } | undefined)?.rol)
  const { data: teams = [], isLoading, error, refetch } = useUserTeams(userId)
  const deleteTeam = useDeleteTeam()
  const [qrTeamId, setQrTeamId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string; divisionCount: number } | null>(null)
  const [checkingDelete, setCheckingDelete] = useState(false)

  const addButtonRef = useRef<any>(null)
  const scrollViewRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const firstCardRef = useRef<any>(null)
  const qrButtonRef = useRef<any>(null)
  const editButtonRef = useRef<any>(null)
  const hasSeenCreateTour = useRef(false)
  const hasSeenManagementTour = useRef(false)
  const [firstCardReady, setFirstCardReady] = useState(false)

  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { startTour } = useTourGuide()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const confirmDelete = async (id: string, nombre: string) => {
    setCheckingDelete(true)
    try {
      const divisions = await divisionEquipoApi.findByEquipo(id).catch(() => [])
      setDeleteTarget({ id, nombre, divisionCount: divisions.length })
    } catch {
      setDeleteTarget({ id, nombre, divisionCount: 0 })
    } finally {
      setCheckingDelete(false)
    }
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    deleteTeam.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Equipo eliminado")
        setDeleteTarget(null)
      },
      onError: (e) => {
        toast.error(e.message || "Error al eliminar")
        setDeleteTarget(null)
      },
    })
  }

  useEffect(() => {
    if (hasSeenCreateTour.current || hasSeenManagementTour.current) return
    if (!isFocused || isLoading || teams.length > 0 || !canCreate) return
    if (!addButtonRef.current) return

    const init = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:team-create-v1")
      if (seen === "completed") { hasSeenCreateTour.current = true; return }

      startTour(
        [
          {
            id: "team-create",
            targetRef: addButtonRef,
            title: "Crea tu primer equipo",
            description: "Crea tu equipo para registrar jugadores y participar en las divisiones de una liga.",
            spotlightPadding: 8,
            tooltipPosition: "bottom",
          },
        ],
        {
          tourId: "team-create-v1",
          insets: { top: insets.top, bottom: insets.bottom },
          nextButtonText: "Siguiente",
          prevButtonText: "Atrás",
          skipButtonText: "Saltar",
          doneButtonText: "Entendido",
          onTourEnd: () => { AsyncStorage.setItem("@tour_guide:team-create-v1", "completed") },
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
      hasSeenCreateTour.current = true
    }
    init()
  }, [isFocused, isLoading, teams.length, startTour, insets.top, insets.bottom, canCreate])

  useEffect(() => {
    if (hasSeenManagementTour.current) return
    if (!isFocused || isLoading || teams.length === 0 || !firstCardReady) return
    if (!firstCardRef.current || !qrButtonRef.current || !editButtonRef.current) return

    const init = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:team-management-v1")
      if (seen === "completed") { hasSeenManagementTour.current = true; return }

      startTour(
        [
          {
            id: "team-card",
            targetRef: firstCardRef,
            title: "Administra tu equipo",
            description: "Toca una tarjeta para administrar jugadores y consultar las divisiones del equipo.",
            spotlightPadding: 8,
            tooltipPosition: "bottom",
          },
          {
            id: "team-qr",
            targetRef: qrButtonRef,
            title: "Comparte el código QR",
            description: "El dueño de una liga puede escanear este código para agregar tu equipo a una división.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          },
          {
            id: "team-edit",
            targetRef: editButtonRef,
            title: "Actualiza tu equipo",
            description: "Modifica el nombre o el escudo de tu equipo cuando lo necesites.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          },
        ],
        {
          tourId: "team-management-v1",
          insets: { top: insets.top, bottom: insets.bottom },
          nextButtonText: "Siguiente",
          prevButtonText: "Atrás",
          skipButtonText: "Saltar",
          doneButtonText: "Entendido",
          onTourEnd: () => { AsyncStorage.setItem("@tour_guide:team-management-v1", "completed") },
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
          scrollRef: scrollViewRef,
          getCurrentScrollOffset: () => scrollOffsetRef.current,
        }
      )
      hasSeenManagementTour.current = true
    }
    init()
  }, [isFocused, isLoading, teams.length, firstCardReady, startTour, insets.top, insets.bottom])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Equipo" rightActions={canCreate ? [{ icon: "add", onPress: () => router.push({ pathname: "/(drawer)/team/team-form" }), bg: Palette.cyan, color: Palette.black, ref: addButtonRef }] : []} />
        <LoadingScreen />
      </View>
    )
  }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Equipo" rightActions={canCreate ? [{ icon: "add", onPress: () => router.push({ pathname: "/(drawer)/team/team-form" }), bg: Palette.cyan, color: Palette.black, ref: addButtonRef }] : []} />
        <PullToRefresh scrollRef={scrollViewRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }} onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ paddingHorizontal: Pad.xl, paddingTop: Gap.base, paddingBottom: 48, gap: Gap.md }}>
          {error ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : teams.length === 0 ? (
            <EmptyState message="No hay equipos registrados" icon="sports" />
          ) : (
            teams.map((t, index) => {
              const card = (
                <TeamCard
                  key={t.id}
                  id={t.id}
                  nombre={t.nombre}
                  logo={t.logo}
                  codigo={t.codigo}
                  onQr={setQrTeamId}
                  onEdit={(id) => router.push({ pathname: "/(drawer)/team/team-form", params: { teamId: id } })}
                  onDelete={confirmDelete}
                  onPress={(teamId) => router.push(`/(drawer)/team/${teamId}`)}
                  qrButtonRef={index === 0 ? qrButtonRef : undefined}
                  editButtonRef={index === 0 ? editButtonRef : undefined}
                />
              )
              if (index === 0) {
                return <View key={t.id} ref={firstCardRef} onLayout={() => setFirstCardReady(true)}>{card}</View>
              }
              return card
            })
          )}
          </View>
        </PullToRefresh>

        <AppBottomSheetModal visible={!!qrTeamId} onClose={() => setQrTeamId(null)} snapPoints={["60%"]}>
            <View style={{ alignItems: "center", gap: Gap.lg, width: "100%" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Palette.text }}>Código QR del equipo</Text>
              {qrTeamId ? (
                <Text style={{ fontSize: 13, color: Palette.textSecondary }}>
                  {teams.find((team) => team.id === qrTeamId)?.nombre ?? "Equipo"} · #{teams.find((team) => team.id === qrTeamId)?.codigo ?? "----"}
                </Text>
              ) : null}
              {qrTeamId ? (
                <View style={{ backgroundColor: Palette.white, borderRadius: Radius.md, padding: Pad.md }}>
                  <QRCode value={qrTeamId} size={200} backgroundColor={Palette.white} color={Palette.black} />
                </View>
              ) : null}
              <Text style={{ fontSize: 13, color: Palette.textSecondary, textAlign: "center" }}>
                El dueño de la liga puede escanear este código para agregarte a una división
              </Text>
              <TouchableOpacity onPress={() => setQrTeamId(null)} style={{ paddingVertical: Pad.md, paddingHorizontal: Pad.xl, borderRadius: Radius.md, backgroundColor: Palette.cyan }}>
                <Text style={{ color: Palette.black, fontWeight: "700", fontSize: 15 }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
        </AppBottomSheetModal>

        <ConfirmationModal
          visible={!checkingDelete && deleteTarget !== null}
          title="Eliminar equipo"
          message={
            deleteTarget && deleteTarget.divisionCount > 0
              ? `"${deleteTarget.nombre}" está asignado a ${deleteTarget.divisionCount} división(es). Al eliminarlo se perderán sus datos, pero los puntos de los demás equipos se mantienen. ¿Eliminar de todas formas?`
              : `¿Eliminar "${deleteTarget?.nombre}"?`
          }
          highlightText={deleteTarget?.nombre}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleteTeam.isPending}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />

        {checkingDelete ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Palette.overlay, justifyContent: "center", alignItems: "center" }}>
            <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, flexDirection: "row", alignItems: "center", gap: Gap.base }}>
              <ActivityIndicator color={Palette.cyan} />
              <Text style={{ color: Palette.text, fontSize: 15 }}>Verificando asignaciones...</Text>
            </View>
          </View>
        ) : null}
      </View>
    </AuthGate>
  )
}
