import { useState, useCallback, useEffect, useRef } from "react"
import { ActivityIndicator, TouchableOpacity, View, Text } from "react-native"
import { useIsFocused, useLocalSearchParams, router } from "expo-router"
import { useTourGuide, type TourStep } from "@wrack/react-native-tour-guide"
import { tourConfig, tourYaCompletado } from "@/shared/utils/tour-config"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useLookups } from "@/features/league/hooks/useLookups"
import { useDivisions, useDeleteDivision } from "@/features/division/hooks/useDivisions"
import { useToast } from "@/shared/components/Toast"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import DivisionListCard from "@/features/division/components/DivisionListCard"
import QrCard from "@/shared/components/QrCard"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { TabBar } from "@/shared/components/TabBar"
import { authClient } from "@/infrastructure/auth/client"
import LeagueRefereeTab from "@/features/arbitraje/LeagueRefereeTab"
import type { LeagueReferee } from "@/features/arbitraje/types"
import { leagueApi } from "@/features/league/api/leagues"
import { hasProgramacionReciente, programacionRecienteFilename, programacionRecienteHtml } from "@/features/league/utils/programacion-reciente-pdf"
import { downloadPdf } from "@/shared/utils/print-pdf"
import { useNavGuard } from "@/shared/hooks/useNavGuard"
import { isRateLimitError } from "@/infrastructure/api/rate-limit"
import { useAccountQuota } from "@/features/users/hooks/useAccountQuota"
import { quotaExhaustedMessage, quotaIsExhausted } from "@/features/users/quota"
import AccountQuotaStatus from "@/features/users/components/AccountQuotaStatus"

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const guard = useNavGuard()
  const isFocused = useIsFocused()
  const { data: league, isLoading, error: leagueError, refetch: refetchLeague } = useLeague(id!, isFocused)
  /**
   * Las divisiones NO salen de `league.divisiones`. Ese arreglo viene de `findVisibleById`, que
   * filtra los borradores con la regla pública incluso para el dueño, así que una división recién
   * creada quedaba invisible justo en la pantalla desde la que hay que publicarla. La vista pública
   * comparte ese mismo endpoint, y por eso el arreglo va aquí y no en el servidor: aflojarlo allá
   * destaparía los borradores a cualquiera.
   *
   * `por-liga` resuelve con `visibleDivisionWhere(actor)`, que sí le suma al dueño las suyas.
   */
  const { data: divisionsData, isLoading: divisionsLoading, refetch: refetchDivisions } = useDivisions(id!, isFocused)
  const divisions = divisionsData ?? []
  const deleteDivision = useDeleteDivision(id!)
  const toast = useToast()
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState("divisiones")
  const lookups = useLookups({
    categorias: isFocused && tab === "divisiones",
    ubicaciones: isFocused && tab === "info" && !!league && !league.ubicacion?.nombreCompleto,
  })
  const [downloadingSchedule, setDownloadingSchedule] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null)
  const addDivisionRef = useRef<any>(null)
  const firstDivisionRef = useRef<any>(null)
  const tabBarRef = useRef<any>(null)
  const infoSummaryRef = useRef<any>(null)
  const qrRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tourStartedRef = useRef(false)
  const tourCheckingRef = useRef(false)
  const [addDivisionReady, setAddDivisionReady] = useState(false)
  const [firstDivisionReady, setFirstDivisionReady] = useState(false)
  const [tabBarReady, setTabBarReady] = useState(false)
  const insets = useSafeAreaInsets()
  const { data: session } = authClient.useSession()
  const { data: quota, refetch: refetchQuota } = useAccountQuota(league?.userId)
  const { startTour, endTour } = useTourGuide()
  const tourBlocked = refreshing || downloadingSchedule || deleteTarget !== null || deleteDivision.isPending

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchLeague(), refetchDivisions(), refetchQuota()])
    } finally {
      setRefreshing(false)
    }
  }, [refetchLeague, refetchDivisions, refetchQuota])

  const openCreateDivision = () => {
    if (quotaIsExhausted(quota, "divisions")) {
      toast.info(quotaExhaustedMessage("divisions"))
      return
    }
    guard(() => router.push({ pathname: "/(drawer)/leagues/[id]/division-form", params: { id: id! } }))
  }

  useEffect(() => {
    if (tourBlocked || !isFocused) endTour()
  }, [tourBlocked, isFocused, endTour])

  useEffect(() => {
    if (!isFocused || isLoading || leagueError || !league || !session?.user || tab !== "divisiones" || tourBlocked) return
    if (tourStartedRef.current || tourCheckingRef.current) return
    if (!addDivisionRef.current || !tabBarRef.current || !addDivisionReady || !tabBarReady) return
    if (divisions.length > 0 && (!firstDivisionRef.current || !firstDivisionReady)) return

    let cancelled = false
    tourCheckingRef.current = true
    const initTour = async () => {
      const seen = await tourYaCompletado("league-detail-v1")
      if (cancelled) return
      if (seen) {
        tourStartedRef.current = true
        tourCheckingRef.current = false
        return
      }

      const steps: TourStep[] = [
        {
          id: "league-detail-add-division",
          targetRef: addDivisionRef,
          title: "Crea una división",
          description: "Agrega categorías o competencias para organizar equipos, jornadas y resultados.",
          spotlightPadding: 8,
          tooltipPosition: "bottom",
        },
      ]

      if (divisions.length > 0) {
        steps.push({
          id: "league-detail-first-division",
          targetRef: firstDivisionRef,
          title: "Administra la competencia",
          description: "Abre una división para gestionar equipos, programación y resultados. La categoría aparece junto al nombre.",
          spotlightPadding: 8,
          tooltipPosition: "top",
        })
      }

      steps.push(
        {
          id: "league-detail-tabs",
          targetRef: tabBarRef,
          title: "Secciones de la liga",
          description: "Alterna entre tus divisiones y la información general de la liga.",
          spotlightPadding: 8,
          tooltipPosition: "bottom",
          onNext: () => setTab("info"),
        },
        {
          id: "league-detail-info",
          targetRef: infoSummaryRef,
          title: "Información general",
          description: "Revisa la ubicación, divisiones, canchas y árbitros configurados para esta liga.",
          spotlightPadding: 8,
          tooltipPosition: "top",
          delayBefore: 350,
          onPrev: () => setTab("divisiones"),
        },
        {
          id: "league-detail-qr",
          targetRef: qrRef,
          title: "Comparte tu liga",
          description: "Comparte este código para que cualquier persona pueda consultar públicamente la liga.",
          spotlightPadding: 8,
          tooltipPosition: "top",
          delayBefore: 250,
        },
      )

      tourTimerRef.current = setTimeout(() => {
        tourStartedRef.current = true
        tourCheckingRef.current = false
        startTour(steps, tourConfig({
          tourId: "league-detail-v1",
          insets,
          onTourEnd: () => setTab("divisiones"),
          getCurrentScrollOffset: () => scrollOffsetRef.current,
        }))
      }, 600)
    }

    initTour()
    return () => {
      cancelled = true
      if (tourTimerRef.current) {
        clearTimeout(tourTimerRef.current)
        tourTimerRef.current = null
      }
      if (!tourStartedRef.current) tourCheckingRef.current = false
    }
  }, [isFocused, isLoading, leagueError, league, session?.user, tab, tourBlocked, divisions.length, addDivisionReady, firstDivisionReady, tabBarReady, startTour, insets])

  const handleDeleteDivision = (divisionId: string, nombre: string) => {
    setDeleteTarget({ id: divisionId, nombre })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const target = deleteTarget
    deleteDivision.mutate({ id: target.id, confirmName: target.nombre }, {
      onSuccess: () => {
        toast.success("División eliminada")
        setDeleteTarget(null)
      },
      onError: (e) => {
        toast.error(e.message || "Error al eliminar")
        if (!isRateLimitError(e)) setDeleteTarget(null)
      },
    })
  }

  const handleDownloadSchedule = async () => {
    if (downloadingSchedule || !league) return
    setDownloadingSchedule(true)
    try {
      const schedule = await leagueApi.getProgramacionReciente(league.id)
      if (!hasProgramacionReciente(schedule)) {
        toast.info("No hay jornadas o partidos para descargar")
        return
      }
      await downloadPdf(programacionRecienteHtml(schedule), programacionRecienteFilename(schedule.nombre || league.nombre))
    } catch (error) {
      toast.error((error as Error).message || "No se pudo generar el PDF")
    } finally {
      setDownloadingSchedule(false)
    }
  }

  if (isLoading || (tab === "divisiones" && (lookups.isLoading || divisionsLoading))) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (leagueError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" onBack={() => router.back()} />
        <ErrorState message={(leagueError as Error).message} onRetry={() => refetchLeague()} fullScreen />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Liga" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, alignItems: "center" }}>
            <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.sans }}>Liga no encontrada</Text>
          </View>
        </View>
      </View>
    )
  }

  const ubicacionTexto = league.ubicacion?.nombreCompleto
    ?? lookups.ubicaciones.find((u) => u.id === league.ubicacionId)?.nombreCompleto
    ?? (lookups.isLoading ? "Cargando ubicación..." : "Ubicación no disponible")
  const refereeLeague = league as typeof league & { usaArbitros?: boolean; arbitros?: LeagueReferee[] }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title={league.nombre} onBack={() => router.back()} />
        <PullToRefresh scrollRef={scrollRef} onScroll={(event) => { scrollOffsetRef.current = event.nativeEvent.contentOffset.y }} onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
            <View ref={tabBarRef} onLayout={() => setTabBarReady(true)}>
              <TabBar tabs={[{ key: "divisiones", label: "Divisiones" }, { key: "info", label: "Info" }, ...(league.reglas?.length ? [{ key: "reglas", label: "Reglas" }] : []), ...(refereeLeague.usaArbitros ? [{ key: "arbitros", label: "Árbitros" }] : [])]} activeTab={tab} onTabChange={setTab} />
            </View>

            {tab === "divisiones" ? (
              <View style={{ gap: Gap.lg }}>
                <AccountQuotaStatus quota={quota} resources={["divisions", "activeDivisions"]} />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Gap.md }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Rol general</Text>
                    <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>Todas las divisiones</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Descargar rol de todas las divisiones"
                    disabled={downloadingSchedule}
                    onPress={handleDownloadSchedule}
                    style={{ height: 36, paddingHorizontal: Pad.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.cyan, backgroundColor: Palette.cyan10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm, opacity: downloadingSchedule ? 0.65 : 1 }}
                  >
                    {downloadingSchedule
                      ? <ActivityIndicator size="small" color={Palette.cyan} />
                      : <MaterialIcons name="picture-as-pdf" size={17} color={Palette.cyan} />}
                    <Text style={{ color: Palette.cyan, fontSize: 12, fontFamily: Fonts.semiBold }}>
                      {downloadingSchedule ? "Preparando" : "Descargar"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <DivisionListCard
                  divisions={divisions}
                  categorias={lookups.categorias}
                  onNavigate={(divisionId) => guard(() => router.push(`/(drawer)/leagues/${id}/divisions/${divisionId}`))}
                  onEdit={(division) => guard(() => router.push({ pathname: "/(drawer)/leagues/[id]/division-form", params: { id: id!, divisionId: division.id } }))}
                  onDelete={handleDeleteDivision}
                  onAdd={openCreateDivision}
                  addButtonRef={addDivisionRef}
                  firstDivisionRef={firstDivisionRef}
                  onAddButtonLayout={() => setAddDivisionReady(true)}
                  onFirstDivisionLayout={() => setFirstDivisionReady(true)}
                />
              </View>
            ) : null}

            {tab === "info" ? (
              <View style={{ gap: Gap.lg }}>
                <View ref={infoSummaryRef} style={{ gap: Gap.lg }}>
                  <View style={{ gap: Gap.sm }}>
                    <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Sobre la liga</Text>
                    {league.descripcion ? (
                      <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "flex-start" }}>
                        <MaterialIcons name="description" size={18} color={Palette.cyan} style={{ marginTop: 2 }} />
                        <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans, lineHeight: 20, flex: 1 }}>{league.descripcion}</Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                      <MaterialIcons name="emoji-events" size={18} color={Palette.cyan} />
                      <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{divisions.length} {divisions.length === 1 ? "división creada" : "divisiones creadas"}</Text>
                    </View>
                  </View>
                  <View style={{ gap: Gap.sm }}>
                    <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Ubicación</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                      <MaterialIcons name="location-on" size={18} color={Palette.cyan} />
                      <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{ubicacionTexto}</Text>
                    </View>
                  </View>
                </View>
                {league.canchas?.length ? (
                  <View style={{ gap: Gap.sm }}>
                    <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Canchas</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
                      {league.canchas.map((court) => (
                        <View key={court.id} style={{
                          backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: court.activa ? Palette.success : Palette.border,
                          paddingHorizontal: Pad.md, paddingVertical: Pad.sm,
                        }}>
                          <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{court.nombre}</Text>
                          <Text style={{ color: court.activa ? Palette.success : Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold }}>{court.activa ? "Activa" : "Inactiva"}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {(league as any).usaArbitros && (league as any).arbitros?.filter((a: any) => a.activo).length > 0 ? (
                  <View style={{ gap: Gap.sm }}>
                    <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Árbitros</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
                      {(league as any).arbitros.filter((a: any) => a.activo).map((a: any) => (
                        <View key={a.id} style={{
                          backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border,
                          paddingHorizontal: Pad.md, paddingVertical: Pad.sm,
                        }}>
                          <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{a.nombre}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                <View ref={qrRef}>
                  <QrCard value={league.id} label="Código QR de la liga" hint="Comparte este código para abrir la vista pública de la liga" />
                </View>
              </View>
            ) : null}

            {tab === "arbitros" && refereeLeague.usaArbitros ? (
              <LeagueRefereeTab leagueId={league.id} referees={refereeLeague.arbitros ?? []} multiplesCanchas={league.multiplesCanchas} enabled={isFocused && tab === "arbitros"} />
            ) : null}

            {tab === "reglas" && league.reglas?.length ? (
              <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", alignItems: "center", padding: Pad.base, gap: Gap.md }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="rule" size={14} color={Palette.cyan} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: Palette.text, fontFamily: Fonts.medium }}>Reglas y directivas</Text>
                  <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 12, color: Palette.cyan, fontFamily: Fonts.semiBold }}>{league.reglas.length}</Text>
                  </View>
                </View>
                <View style={{ paddingHorizontal: Pad.base, paddingBottom: Pad.base }}>
                  <View style={{ height: 1, backgroundColor: Palette.border, marginBottom: Pad.base }} />
                  {league.reglas.map((regla, index) => (
                    <View key={index}>
                      {index > 0 ? (
                        <>
                          <View style={{ height: Pad.base }} />
                          <View style={{ height: 1, backgroundColor: Palette.borderActive }} />
                          <View style={{ height: Pad.base }} />
                        </>
                      ) : null}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, color: Palette.cyan, fontFamily: Fonts.semiBold }}>{index + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{regla.titulo}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.sans, lineHeight: 20, marginTop: 2, paddingLeft: 30 }}>{regla.detalle}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </PullToRefresh>
      </View>
      <ConfirmationModal
        visible={deleteTarget !== null}
        title="Eliminar división"
        message={`¿Seguro que quieres eliminar la división "${deleteTarget?.nombre}"?`}
        highlightText={deleteTarget?.nombre}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteDivision.isPending}
        requireText={deleteTarget?.nombre}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AuthGate>
  )
}
