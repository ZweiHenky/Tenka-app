import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide, type TourStep } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIsFocused, useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"
import DayGroup from "@/features/jornada/components/DayGroup"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import { AuthGate } from "@/shared/components/AuthGate"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"
import { downloadPdf } from "@/shared/utils/print-pdf"
import { programacionJornadaFilename, programacionJornadaHtml } from "@/features/jornada/utils/programacion-jornada-pdf"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useToast } from "@/shared/components/Toast"
import { authClient } from "@/infrastructure/auth/client"
import { toLocalDateKey } from "@/shared/utils/date-time"
import { useNavGuard } from "@/shared/hooks/useNavGuard"

export default function JornadaDetailScreen() {
  const toast = useToast()
  const guard = useNavGuard()
  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { id, divisionId, jornadaId } = useLocalSearchParams<{ id: string; divisionId: string; jornadaId: string }>()
  const qc = useQueryClient()
  const { data: session } = authClient.useSession()
  const { data: league } = useLeague(id ?? "")
  const division = league?.divisiones?.find((item) => item.id === divisionId)
  const { startTour, endTour, isActive: isTourActive, activeTourId } = useTourGuide()

  const { data: jornada, isLoading, error, refetch } = useQuery({
    queryKey: ["jornada", jornadaId],
    queryFn: () => jornadaApi.getById(jornadaId!),
    enabled: !!jornadaId,
  })

  const [refreshing, setRefreshing] = useState(false)
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>()
  const summaryRef = useRef<any>(null)
  const dayHeaderRef = useRef<any>(null)
  const firstPartidoRef = useRef<any>(null)
  const legendRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tourStartedRef = useRef(false)
  const tourCheckingRef = useRef(false)
  const [summaryReady, setSummaryReady] = useState(false)
  const [dayHeaderReady, setDayHeaderReady] = useState(false)
  const [firstPartidoReady, setFirstPartidoReady] = useState(false)
  const [legendReady, setLegendReady] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["jornada", jornadaId] }),
        qc.invalidateQueries({ queryKey: ["jornadas-infinitas", jornada?.divisionId] }),
        qc.invalidateQueries({ queryKey: ["tabla-posiciones", jornada?.divisionId] }),
        qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, jornadaId, jornada?.divisionId, divisionId])

  const groupedByDay = useMemo(() => {
    if (!jornada?.partidos) return []
    const groups: Record<string, typeof jornada.partidos> = {}
    for (const p of jornada.partidos) {
      const key = p.fecha ? toLocalDateKey(p.fecha) : "sin-fecha"
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "sin-fecha") return 1
      if (b === "sin-fecha") return -1
      return a.localeCompare(b)
    })
  }, [jornada])

  const expandedDayKey = useMemo(() => {
    if (selectedDayKey === null) return null
    if (selectedDayKey && groupedByDay.some(([dateKey]) => dateKey === selectedDayKey)) return selectedDayKey
    return groupedByDay.find(([, partidos]) => partidos.some((partido) => partido.estado !== "FINALIZADO"))?.[0]
      ?? groupedByDay[0]?.[0]
      ?? null
  }, [groupedByDay, selectedDayKey])

  useEffect(() => {
    if ((!isFocused || refreshing) && isTourActive && activeTourId === "jornada-detail-v1") {
      endTour()
    }
  }, [isFocused, refreshing, isTourActive, activeTourId, endTour])

  useEffect(() => {
    if (!isFocused || isTourActive || isLoading || error || !jornada?.partidos?.length || !session?.user || refreshing) return
    if (tourStartedRef.current || tourCheckingRef.current) return
    if (!summaryRef.current || !dayHeaderRef.current || !firstPartidoRef.current || !legendRef.current || !summaryReady || !dayHeaderReady || !firstPartidoReady || !legendReady) return

    let cancelled = false
    tourCheckingRef.current = true
    const initTour = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:jornada-detail-v1")
      if (cancelled) return
      if (seen === "completed") {
        tourStartedRef.current = true
        tourCheckingRef.current = false
        return
      }

      const steps: TourStep[] = [
        {
          id: "jornada-detail-summary",
          targetRef: summaryRef,
          title: "Resumen de la jornada",
          description: "Consulta cuántos partidos tiene la jornada y usa el botón PDF para compartir su programación.",
          spotlightPadding: 8,
          tooltipPosition: "bottom",
        },
        {
          id: "jornada-detail-day",
          targetRef: dayHeaderRef,
          title: "Partidos por día",
          description: "Abre un día para ver sus partidos. Solo uno permanece desplegado y aquí puedes seguir su progreso.",
          spotlightPadding: 8,
          tooltipPosition: "bottom",
        },
        {
          id: "jornada-detail-match",
          targetRef: firstPartidoRef,
          title: "Captura el resultado",
          description: "Abre un partido para registrar o modificar su resultado, estado y penales cuando correspondan.",
          spotlightPadding: 8,
          tooltipPosition: "top",
        },
        {
          id: "jornada-detail-types",
          targetRef: legendRef,
          title: "Identifica el tipo de partido",
          description: "La barra de color indica si el partido es regular, amistoso, de complemento o eliminatoria.",
          spotlightPadding: 8,
          tooltipPosition: "top",
          delayBefore: 350,
        },
      ]

      tourTimerRef.current = setTimeout(() => {
        tourStartedRef.current = true
        tourCheckingRef.current = false
        startTour(steps, {
          tourId: "jornada-detail-v1",
          insets: { top: insets.top, bottom: insets.bottom },
          nextButtonText: "Siguiente",
          prevButtonText: "Atrás",
          skipButtonText: "Saltar",
          doneButtonText: "Entendido",
          onTourEnd: () => {
            AsyncStorage.setItem("@tour_guide:jornada-detail-v1", "completed")
          },
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
        })
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
  }, [isFocused, isTourActive, isLoading, error, jornada, session?.user, refreshing, summaryReady, dayHeaderReady, firstPartidoReady, legendReady, startTour, insets.top, insets.bottom])

  const handlePartidoPress = (partido: PartidoResponse) => {
    if (isTourActive && activeTourId === "jornada-detail-v1") endTour()
    guard(() => router.push(`/leagues/${id}/divisions/${divisionId}/partidos/${partido.id}`))
  }

  const handleDownloadPdf = async () => {
    if (isTourActive && activeTourId === "jornada-detail-v1") endTour()
    if (!jornada?.partidos || jornada.partidos.length === 0) {
      toast.info("No hay partidos para descargar")
      return
    }
    if (!league?.nombre || !division?.nombre || !division.categoria?.nombre) {
      toast.error("No se pudo obtener la liga, división y categoría para generar el PDF")
      return
    }
    try {
      const metadata = {
        leagueName: league.nombre,
        divisionName: division.nombre,
        categoryName: division.categoria.nombre,
        jornadaNumero: jornada.numero,
        includeCourt: league.multiplesCanchas,
      }
      await downloadPdf(programacionJornadaHtml(metadata, jornada.partidos), programacionJornadaFilename(metadata))
    } catch {
      toast.error("Error al generar PDF")
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="" />
        <LoadingScreen />
      </View>
    )
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" />
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} fullScreen />
      </View>
    )
  }

  if (!jornada) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Palette.text, fontSize: 16 }}>Jornada no encontrada</Text>
      </View>
    )
  }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title={`Jornada ${jornada.numero}`} />
        <PullToRefresh
          onRefresh={handleRefresh}
          refreshing={refreshing}
          scrollRef={scrollRef}
          onScroll={(event) => { scrollOffsetRef.current = event.nativeEvent.contentOffset.y }}
        >
          <View style={{ padding: Pad.base, gap: Gap.md, paddingBottom: 48 }}>
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
          <View ref={summaryRef} collapsable={false} onLayout={() => setSummaryReady(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Pad.base, paddingVertical: Pad.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <MaterialIcons name="calendar-month" size={22} color={Palette.cyan} />
              <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.display }}>Jornada {jornada.numero}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              {jornada.partidos ? <Text style={{ color: Palette.textMuted, fontSize: 13 }}>{jornada.partidos.length} partidos</Text> : null}
              {jornada.partidos && jornada.partidos.length > 0 ? (
                <TouchableOpacity onPress={handleDownloadPdf} style={{ width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Palette.cyan20, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="picture-as-pdf" size={18} color={Palette.cyan} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View style={{ paddingHorizontal: Pad.base, paddingBottom: Pad.base, gap: Gap.lg }}>
            {groupedByDay.length > 0 ? (
              groupedByDay.map(([dateKey, dayPartidos]) => (
                <DayGroup
                  key={dateKey}
                  dateKey={dateKey}
                  partidos={dayPartidos}
                  expanded={expandedDayKey === dateKey}
                  onToggle={() => setSelectedDayKey(expandedDayKey === dateKey ? null : dateKey)}
                  onPartidoPress={handlePartidoPress}
                  headerRef={expandedDayKey === dateKey ? dayHeaderRef : undefined}
                  onHeaderLayout={expandedDayKey === dateKey ? () => setDayHeaderReady(true) : undefined}
                  firstPartidoRef={expandedDayKey === dateKey ? firstPartidoRef : undefined}
                  onFirstPartidoLayout={expandedDayKey === dateKey ? () => setFirstPartidoReady(true) : undefined}
                />
              ))
            ) : (
              <EmptyState message="No hay partidos en esta jornada" icon="sports-soccer" />
            )}
          </View>
        </View>
          <View ref={legendRef} collapsable={false} onLayout={() => setLegendReady(true)} style={{ backgroundColor: Palette.surface, borderRadius: Radius.md, padding: Pad.base, gap: Gap.sm, borderWidth: 1, borderColor: Palette.border }}>
          <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold, marginBottom: 2 }}>Tipos de partido</Text>
          <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "center" }}>
            <View style={{ width: 4, height: 16, backgroundColor: Palette.cyan, borderRadius: 2 }} />
            <Text style={{ color: Palette.text, fontSize: 12, fontFamily: Fonts.semiBold }}>Regular</Text>
            <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans, flex: 1 }}>ambos equipos compiten por puntos</Text>
          </View>
          <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "center" }}>
            <View style={{ width: 4, height: 16, backgroundColor: Palette.success, borderRadius: 2 }} />
            <Text style={{ color: Palette.text, fontSize: 12, fontFamily: Fonts.semiBold }}>Amistoso</Text>
            <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans, flex: 1 }}>ningún equipo suma puntos</Text>
          </View>
          <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "center" }}>
            <View style={{ width: 4, height: 16, backgroundColor: Palette.warning, borderRadius: 2 }} />
            <Text style={{ color: Palette.text, fontSize: 12, fontFamily: Fonts.semiBold }}>Completar</Text>
            <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans, flex: 1 }}>el visitante no suma puntos</Text>
          </View>
          <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "center" }}>
            <View style={{ width: 4, height: 16, backgroundColor: Palette.playoff, borderRadius: 2 }} />
            <Text style={{ color: Palette.text, fontSize: 12, fontFamily: Fonts.semiBold }}>Eliminatoria</Text>
            <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans, flex: 1 }}>eliminación directa</Text>
          </View>
          </View>
          </View>
        </PullToRefresh>
      </View>
    </AuthGate>
  )
}
