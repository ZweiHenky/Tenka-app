import { useState, useMemo, useRef, useCallback } from "react"
import { View, Text } from "react-native"
import type { TourStep } from "@wrack/react-native-tour-guide"
import type { League } from "@/domain/interfaces/league"
import { useIsFocused, useLocalSearchParams, router } from "expo-router"
import { Palette, Pad, Gap, Fonts, Radius } from "@/constants/theme"
import { useDivisionEquipos, useRemoveTeam } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useJornadas, useDeleteJornada } from "@/features/jornada/hooks/useJornadas"
import { useLookups } from "@/features/league/hooks/useLookups"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { resolveNombre } from "@/shared/utils/resolve-lookup"
import { divisionApi } from "@/features/division/api/divisions"
import EquiposTab from "@/features/division/components/EquiposTab"
import JornadasTab from "@/features/division/components/JornadasTab"
import DivisionInfoSheet from "@/features/division/components/DivisionInfoSheet"
import DivisionActionSheet from "@/features/division/components/DivisionActionSheet"
import QRScannerModal from "@/shared/components/QRScannerModal"
import { AuthGate } from "@/shared/components/AuthGate"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"

import { useToast } from "@/shared/components/Toast"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useDivisionScheduleStore } from "@/stores/divisionSchedule"
import { useRondasPlayoff, useGenerateRondas, useDeleteRondasByDivision } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import EliminatoriasTab from "@/features/division/components/EliminatoriasTab"
import PlayoffTeamSelectorModal from "@/features/division/components/PlayoffTeamSelectorModal"
import DivisionConfirmDialogs from "@/features/division/components/DivisionConfirmDialogs"
import { useResetDivision, useUpdateDivision } from "@/features/division/hooks/useDivisions"
import { TabBar } from "@/shared/components/TabBar"
import DivisionScheduleManager from "@/features/division/components/DivisionScheduleManager"
import PosicionesTab from "@/features/division/components/PosicionesTab"
import { useTablaPosiciones } from "@/features/tabla-posicion/hooks/useTablaPosiciones"
import { useDivisionScanner } from "@/features/division/hooks/useDivisionScanner"
import { authClient } from "@/infrastructure/auth/client"
import { useTour } from "@/shared/hooks/useTour"
import { useJornadaGeneration } from "@/features/division/hooks/useJornadaGeneration"
import { preparePlayoffSlots } from "@/features/division/utils/preparePlayoffSlots"
import { getPlayoffTeamOptions } from "@/features/division/utils/playoff"
import { useGoleadores } from "@/features/goleador/hooks/useGoleadores"
import GoleadoresTable from "@/features/goleador/components/GoleadoresTable"
import { useNavGuard } from "@/shared/hooks/useNavGuard"

export default function DivisionDetailScreen() {
  const toast = useToast()
  const guard = useNavGuard()
  const { id: ligaId, divisionId } = useLocalSearchParams<{ id: string; divisionId: string }>()
  const [tab, setTab] = useState("equipos")
  const isFocused = useIsFocused()
  const [modalRondas, setModalRondas] = useState(false)
  const [infoSheetOpen, setInfoSheetOpen] = useState(false)
  const [actionSheetOpen, setActionSheetOpen] = useState(false)

  const { data: division, isLoading: loadDiv, error: divError, refetch: refetchDiv } = useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId!),
    enabled: !!divisionId,
  })
  const lookups = useLookups({
    estadosLiga: isFocused && (infoSheetOpen || actionSheetOpen),
    tiposCompetencia: isFocused,
    categorias: isFocused && infoSheetOpen,
    tipos: isFocused && infoSheetOpen,
  })
  const { isLoading: leagueOptionsLoading } = useLeague(ligaId!, isFocused && actionSheetOpen)
  const { data: links = [], isLoading: linksLoading, error: linksError, refetch: refetchLinks } = useDivisionEquipos(divisionId!)
  const removeTeam = useRemoveTeam()
  const { data: jornadas = [], isLoading: jornadasLoading, error: jornadasError, refetch: refetchJornadas } = useJornadas(divisionId!, isFocused && (tab === "jornadas" || tab === "programacion"))
  const deleteJornada = useDeleteJornada()
  const setHabilitados = useDivisionScheduleStore((s) => s.setHabilitados)
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const schedules = useDivisionScheduleStore((s) => s.schedules)
  const roundsEnabled = isFocused && (tab === "eliminatorias" || tab === "programacion" || actionSheetOpen || modalRondas)
  const { data: rondas = [], isLoading: rondasLoading, error: rondasError } = useRondasPlayoff(divisionId!, roundsEnabled)
  const { data: standings = [], isLoading: standingsLoading, error: standingsError } = useTablaPosiciones(divisionId!, isFocused && tab === "posiciones")
  const goleadores = useGoleadores(divisionId, isFocused && tab === "goleo")
  const playoffMode = rondas.length > 0
  const generateRondas = useGenerateRondas()
  const deleteRondas = useDeleteRondasByDivision()
  const resetDivision = useResetDivision()
  const updateDivision = useUpdateDivision(ligaId!)
  const generatingLlaves = useRef(false)
  const clearEliminatoriaSlots = useDivisionScheduleStore((s) => s.clearEliminatoriaSlots)
  const setPlayoffMode = useDivisionScheduleStore((s) => s.setPlayoffMode)
  const qc = useQueryClient()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showDeletePlayoffsConfirm, setShowDeletePlayoffsConfirm] = useState(false)
  const [pendingTeamRemoval, setPendingTeamRemoval] = useState<{ nombre: string; equipoId: string } | null>(null)
  const [pendingJornadaDelete, setPendingJornadaDelete] = useState<{ jornadaId: string; numero: number } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const infoActionRef = useRef<any>(null)
  const optionsActionRef = useRef<any>(null)
  const tabBarRef = useRef<any>(null)
  const teamsSectionRef = useRef<any>(null)
  const scheduleSectionRef = useRef<any>(null)
  const jornadasSectionRef = useRef<any>(null)
  const standingsSectionRef = useRef<any>(null)
  const playoffsSectionRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const [infoActionReady, setInfoActionReady] = useState(false)
  const [optionsActionReady, setOptionsActionReady] = useState(false)
  const [tabBarReady, setTabBarReady] = useState(false)
  const [teamsSectionReady, setTeamsSectionReady] = useState(false)
  const { data: session } = authClient.useSession()
  const tipoCompNombre = resolveNombre(lookups.tiposCompetencia, division?.tipoCompetenciaId ?? "")
  const tieneEliminatorias = tipoCompNombre.includes("Eliminatorias")
  const hasPlayoffs = tieneEliminatorias && rondas.length > 0
  const ultimaRonda = useMemo(() =>
    rondas.length > 0 ? rondas.reduce((max, r) => r.orden > max.orden ? r : max, rondas[0]) : null,
    [rondas],
  )
  const partidosUltimaRonda = ultimaRonda?.partidos ?? []
  const ligaCompletada = partidosUltimaRonda.length > 0 &&
    partidosUltimaRonda.every((p: any) => p.estado === "FINALIZADO")

  const estadoNombre = resolveNombre(lookups.estadosLiga, division?.estadoLigaId ?? "")
  const isBorrador = estadoNombre === "Borrador"
  const isEnCurso = estadoNombre === "En Curso"
  const cambioEstadoMutation = useMutation({
    mutationFn: (nuevoEstadoId: string) => divisionApi.update(divisionId!, { estadoLigaId: nuevoEstadoId }),
    onSuccess: (updated) => {
      qc.setQueryData(["division", divisionId], updated)
      qc.setQueryData(["leagues", ligaId], (current: League | undefined) => current ? {
        ...current,
        divisiones: current.divisiones?.map((item) => item.id === updated.id ? { ...item, ...updated } : item),
      } : current)
      qc.invalidateQueries({ queryKey: ["divisions", ligaId], exact: true })
      qc.invalidateQueries({ queryKey: ["ligas-infinitas"], refetchType: "none" })
      toast.success(isBorrador ? "División publicada" : "División regresada a borrador")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["division", divisionId] }),
        qc.invalidateQueries({ queryKey: ["division-equipos", divisionId] }),
        qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] }),
        tab === "jornadas" || tab === "programacion" ? qc.invalidateQueries({ queryKey: ["jornadas", divisionId] }) : Promise.resolve(),
        tab === "programacion" ? qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] }) : Promise.resolve(),
        tab === "posiciones" ? qc.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] }) : Promise.resolve(),
        tab === "goleo" ? qc.invalidateQueries({ queryKey: ["goleadores", divisionId] }) : Promise.resolve(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, divisionId, tab])

  const {
    scannerOpen,
    scannerError,
    assignTeamIsPending,
    handleBarcodeScanned,
    handleScannerRetry,
    handleScannerClose,
    handleScannerOpen,
  } = useDivisionScanner(divisionId!, links)

  const assignedTeams = useMemo(
    () => links.map((link) => ({ ...link.equipo, saldoPendiente: link.saldoPendiente })),
    [links],
  )
  const opcionesEquipos = useMemo(
    () => getPlayoffTeamOptions(assignedTeams.length),
    [assignedTeams.length],
  )

  const { handleGenerateJornada, isGeneratingJornada } = useJornadaGeneration({
    divisionId: divisionId!,
    leagueId: ligaId!,
    ligaCompletada,
    playoffMode,
    onGenerated: () => setTab("jornadas"),
  })

  const tourBlocked = refreshing || scannerOpen || modalRondas || infoSheetOpen || actionSheetOpen || pendingTeamRemoval !== null || pendingJornadaDelete !== null || showDeletePlayoffsConfirm || showResetConfirm || assignTeamIsPending || removeTeam.isPending || isGeneratingJornada || deleteJornada.isPending || generateRondas.isPending || deleteRondas.isPending || resetDivision.isPending || cambioEstadoMutation.isPending
  const tourDataLoading = loadDiv || linksLoading || jornadasLoading || rondasLoading || standingsLoading || lookups.isLoading
  const tourDataError = divError || linksError || jornadasError || rondasError || standingsError

  const switchTourTab = useCallback((nextTab: string) => {
    setTab(nextTab)
    requestAnimationFrame(() => scrollRef.current?.scrollTo?.({ y: 0, animated: false }))
  }, [])

  const getCurrentTourScrollOffset = useCallback(() => scrollOffsetRef.current, [])
  const handleTourEnd = useCallback(() => switchTourTab("equipos"), [switchTourTab])

  const tourSteps = useMemo<TourStep[]>(() => {
    const steps: TourStep[] = [
      { id: "division-detail-info", targetRef: infoActionRef, title: "Consulta la configuración", description: "Aquí revisas el estado, la categoría, el tipo de competencia, el arbitraje y los horarios de esta división.", spotlightPadding: 8, tooltipPosition: "bottom" },
      { id: "division-detail-options", targetRef: optionsActionRef, title: "Administra la división", description: "Desde aquí puedes publicar o volver a borrador, crear o eliminar eliminatorias y reiniciar la temporada.", spotlightPadding: 8, tooltipPosition: "bottom" },
      { id: "division-detail-tabs", targetRef: tabBarRef, title: "Tu flujo de competencia", description: "Trabaja en orden: agrega equipos, configura la programación, consulta las jornadas y revisa las posiciones.", spotlightPadding: 8, tooltipPosition: "bottom" },
      { id: "division-detail-teams", targetRef: teamsSectionRef, title: assignedTeams.length === 0 ? "Agrega equipos" : "Elige quién juega", description: assignedTeams.length === 0 ? "Escanea el código QR de un equipo para incorporarlo a esta división." : "Marca los equipos con arbitraje pagado. Solo los seleccionados participarán en la próxima jornada.", spotlightPadding: 8, tooltipPosition: "top", onNext: () => switchTourTab("programacion") },
      { id: "division-detail-schedule", targetRef: scheduleSectionRef, title: "Prepara la jornada", description: "Configura fechas, horarios, equipos y, cuando aplique, cancha y árbitro antes de generar la jornada.", spotlightPadding: 8, tooltipPosition: "top", delayBefore: 500, onPrev: () => switchTourTab("equipos"), onNext: () => switchTourTab("jornadas") },
      { id: "division-detail-rounds", targetRef: jornadasSectionRef, title: jornadas.length === 0 ? "Consulta las jornadas" : "Captura resultados", description: jornadas.length === 0 ? "Las jornadas que generes aparecerán aquí para consultar y capturar sus partidos." : "Abre una jornada para actualizar sus partidos. Solo la jornada más reciente puede eliminarse.", spotlightPadding: 8, tooltipPosition: "top", delayBefore: 350, onPrev: () => switchTourTab("programacion"), onNext: () => switchTourTab("posiciones") },
      { id: "division-detail-standings", targetRef: standingsSectionRef, title: "Sigue la tabla", description: standings.length === 0 ? "Las posiciones aparecerán cuando existan resultados registrados." : "La tabla se calcula con los resultados y también puedes descargarla en PDF.", spotlightPadding: 8, tooltipPosition: "top", delayBefore: 350, onPrev: () => switchTourTab("jornadas"), onNext: hasPlayoffs ? () => switchTourTab("eliminatorias") : undefined },
      ...(hasPlayoffs ? [{ id: "division-detail-playoffs", targetRef: playoffsSectionRef, title: "Sigue las eliminatorias", description: "Abre cada ronda para revisar sus cruces y entra a un partido para registrar el resultado.", spotlightPadding: 8, tooltipPosition: "top" as const, delayBefore: 400, onPrev: () => switchTourTab("posiciones") }] : []),
    ]
    return steps
  }, [assignedTeams.length, jornadas.length, standings.length, hasPlayoffs, switchTourTab])

  useTour({
    tourId: "division-detail-v1",
    isFocused,
    isBlocked: tourBlocked,
    isEnabled: !tourDataLoading && !tourDataError && !!division && !!session?.user && tab === "equipos",
    allRefsReady: infoActionReady && optionsActionReady && tabBarReady && teamsSectionReady,
    steps: tourSteps,
    scrollRef,
    getCurrentScrollOffset: getCurrentTourScrollOffset,
    onTourEnd: handleTourEnd,
  })

  const handleRemove = (nombre: string, equipoId: string) => {
    setPendingTeamRemoval({ nombre, equipoId })
  }

  const handleToggleArbitraje = (id: string) => {
    const current = useDivisionScheduleStore.getState().habilitados[divisionId!] ?? []
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setHabilitados(divisionId!, next)
  }

  const handlePublish = useCallback(() => {
    setActionSheetOpen(false)
    const enCursoId = lookups.estadosLiga.find((e) => e.nombre === "En Curso")?.id
    if (enCursoId) cambioEstadoMutation.mutate(enCursoId)
  }, [lookups, cambioEstadoMutation])

  const handleRevertToBorrador = useCallback(() => {
    setActionSheetOpen(false)
    const borradorId = lookups.estadosLiga.find((e) => e.nombre === "Borrador")?.id
    if (borradorId) cambioEstadoMutation.mutate(borradorId)
  }, [lookups, cambioEstadoMutation])

  const handleGeneratePlayoffs = useCallback(() => {
    if (opcionesEquipos.length === 0) {
      toast.error("Se necesitan al menos 2 equipos para generar eliminatorias")
      return
    }
    setActionSheetOpen(false)
    setModalRondas(true)
  }, [opcionesEquipos, toast])

  const handleDeletePlayoffs = useCallback(() => {
    setActionSheetOpen(false)
    setShowDeletePlayoffsConfirm(true)
  }, [])

  const handleReset = useCallback(() => {
    setActionSheetOpen(false)
    setShowResetConfirm(true)
  }, [])


  const handleToggleRegistrarParticipaciones = useCallback((value: boolean) => {
    updateDivision.mutate(
      { id: divisionId!, data: { registrarParticipaciones: value } },
      {
        onSuccess: () => toast.success(value ? "Registro de participantes activado" : "Registro de participantes desactivado"),
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [divisionId, toast, updateDivision])

  const handleSelectPlayoffTeams = useCallback((n: number) => {
    if (generatingLlaves.current || !division) return
    generatingLlaves.current = true
    setModalRondas(false)
    generateRondas.mutate({ divisionId: divisionId!, leagueId: ligaId, cantidadEquipos: n }, {
      onSuccess: (rondasData) => {
        try {
          const eliminados: { id: string; nombre: string; llave: number }[] = []
          for (const r of rondasData) {
            for (const p of r.partidos) {
              eliminados.push({ id: p.id, nombre: r.nombre, llave: p.llave ?? 0 })
            }
          }
          let existing = schedules[divisionId!]
          if (!existing) {
            const st = useDivisionScheduleStore.getState()
            st.initSchedule(divisionId!, division.diasPartido ?? "sab", division.horarioPartido ?? "08:00-20:00", division.duracionPartido ?? 60, division.descanso ?? 0, undefined, 0, [])
            existing = useDivisionScheduleStore.getState().schedules[divisionId!]
          }
          if (existing) {
            const newSlots = preparePlayoffSlots(existing.slots, division, eliminados)
            const store = useDivisionScheduleStore.getState()
            store.setScheduleTipoSlots(divisionId!, newSlots)
          }
          setTab("eliminatorias")
          toast.success("Eliminatorias generadas")
        } finally {
          generatingLlaves.current = false
        }
      },
      onError: (e: any) => {
        generatingLlaves.current = false
        toast.error(e.message)
      },
    })
  }, [divisionId, ligaId, division, schedules, generateRondas, setTab, toast])


  const handleConfirmRemoveTeam = useCallback(() => {
    if (!pendingTeamRemoval) return
    removeTeam.mutate(
      { divisionId: divisionId!, equipoId: pendingTeamRemoval.equipoId },
      {
        onSuccess: () => {
          toast.success("Equipo quitado")
          setPendingTeamRemoval(null)
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [divisionId, pendingTeamRemoval, removeTeam, toast])

  const handleConfirmDeleteJornada = useCallback(() => {
    if (!pendingJornadaDelete) return
    deleteJornada.mutate(
      { id: pendingJornadaDelete.jornadaId, divisionId: divisionId!, leagueId: ligaId },
      {
        onSuccess: () => {
          setPendingJornadaDelete(null)
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [divisionId, ligaId, pendingJornadaDelete, deleteJornada, toast])

  const handleConfirmDeletePlayoffs = useCallback(() => {
    deleteRondas.mutate({ divisionId: divisionId!, leagueId: ligaId }, {
      onSuccess: () => {
        clearEliminatoriaSlots(divisionId!)
        setPlayoffMode(divisionId!, false)
        setShowDeletePlayoffsConfirm(false)
        setTab("jornadas")
      },
      onError: (error: Error) => toast.error(error.message),
    })
  }, [divisionId, ligaId, deleteRondas, clearEliminatoriaSlots, setPlayoffMode, setTab, toast])

  const handleConfirmReset = useCallback(() => {
    resetDivision.mutate({ divisionId: divisionId!, leagueId: ligaId! }, {
      onSuccess: () => {
        setShowResetConfirm(false)
      },
      onError: (error: Error) => toast.error(error.message),
    })
  }, [divisionId, ligaId, resetDivision, toast])

  if (loadDiv) {
    return <LoadingScreen />
  }

  if (divError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <ErrorState message={(divError as Error).message} onRetry={() => refetchDiv()} fullScreen />
      </View>
    )
  }

  if (!division) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.xl, alignItems: "center", borderWidth: 1, borderColor: Palette.border }}>
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.sans }}>División no encontrada</Text>
        </View>
      </View>
    )
  }

  const tabs = [
    { key: "equipos", label: "Equipo" },
    { key: "programacion", label: "Programación" },
    { key: "jornadas", label: "Jornada" },
    { key: "posiciones", label: "Posiciones" },
    { key: "goleo", label: "Goleo" },
    ...(tieneEliminatorias
      ? [{ key: "eliminatorias", label: "Eliminatoria" }]
      : []),
  ]

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader
          title={division.nombre}
          rightActions={[
            { icon: "info-outline", onPress: () => setInfoSheetOpen(true), ref: infoActionRef, onLayout: () => setInfoActionReady(true) },
            { icon: "more-vert", onPress: () => setActionSheetOpen(true), ref: optionsActionRef, onLayout: () => setOptionsActionReady(true) },
          ]}
        />
        <PullToRefresh
          keyboardAware
          onRefresh={handleRefresh}
          refreshing={refreshing}
          scrollRef={scrollRef}
          onScroll={(event) => { scrollOffsetRef.current = event.nativeEvent.contentOffset.y }}
        >
          <View style={{ padding: Pad.base, gap: Gap.xl, paddingBottom: 48 }}>
            <View ref={tabBarRef} collapsable={false} onLayout={() => setTabBarReady(true)}>
              <TabBar tabs={tabs} activeTab={tab} onTabChange={setTab} />
            </View>

            {tab === "equipos" ? (
              <View ref={teamsSectionRef} collapsable={false} onLayout={() => setTeamsSectionReady(true)}>
                <EquiposTab
                  divisionId={divisionId!}
                  assignedTeams={assignedTeams}
                  habilitados={habilitados ?? []}
                  onToggleArbitraje={handleToggleArbitraje}
                  onRemove={handleRemove}
                  onManagePlayers={(teamId) => guard(() => router.push({
                    pathname: "/(drawer)/leagues/[id]/divisions/[divisionId]/teams/[teamId]",
                    params: { id: ligaId!, divisionId: divisionId!, teamId },
                  }))}
                  onScannerOpen={handleScannerOpen}
                  onToggleSelectAll={() => { const all = assignedTeams.map((t) => t.id); const current = habilitados ?? []; setHabilitados(divisionId!, current.length === all.length ? [] : all) }}
                  linksError={linksError}
                  refetchLinks={refetchLinks}
                />
              </View>
            ) : null}

            {tab === "jornadas" ? (
              <View ref={jornadasSectionRef} collapsable={false}>
                <JornadasTab
                  divisionId={divisionId!}
                  ligaId={ligaId!}
                  jornadas={jornadas}
                  jornadasError={jornadasError}
                  refetchJornadas={refetchJornadas}
                  ligaCompletada={ligaCompletada}
                  onDelete={(jornadaId, numero) => setPendingJornadaDelete({ jornadaId, numero })}
                />
              </View>
            ) : null}

            {tab === "posiciones" ? (
              <View ref={standingsSectionRef} collapsable={false}>
                <PosicionesTab
                  divisionNombre={division.nombre}
                  standings={standings}
                  standingsLoading={standingsLoading}
                />
              </View>
            ) : null}

            {tab === "goleo" ? <GoleadoresTable data={goleadores.data} isLoading={goleadores.isLoading} error={goleadores.error} /> : null}

            {tab === "eliminatorias" && tieneEliminatorias ? (
              <View ref={playoffsSectionRef} collapsable={false}>
                {rondasLoading ? <LoadingScreen /> : rondasError ? (
                  <ErrorState message={(rondasError as Error).message} />
                ) : rondas.length > 0 ? (
                  <EliminatoriasTab
                    rondas={rondas}
                    onPartidoPress={(partido) => guard(() => router.push(`/(drawer)/leagues/${ligaId}/divisions/${divisionId}/partidos/${partido.id}`))}
                  />
                ) : (
                  <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.xl, alignItems: "center", borderWidth: 1, borderColor: Palette.border }}>
                    <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>Aún no se han generado eliminatorias.</Text>
                  </View>
                )}
              </View>
            ) : null}

            {tab === "programacion" ? (
              <View ref={scheduleSectionRef} collapsable={false}>
                <DivisionScheduleManager
                  divisionId={divisionId!}
                  embedded
                  isFocused={isFocused}
                  isGeneratingJornada={isGeneratingJornada}
                  onGenerateJornada={handleGenerateJornada}
                  scrollRef={scrollRef}
                  scrollOffsetRef={scrollOffsetRef}
                />
              </View>
            ) : null}
          </View>
        </PullToRefresh>
      </View>

      <PlayoffTeamSelectorModal
        visible={modalRondas}
        onClose={() => setModalRondas(false)}
        opcionesEquipos={opcionesEquipos}
        generateRondasIsPending={generateRondas.isPending}
        onSelect={handleSelectPlayoffTeams}
      />

      <QRScannerModal visible={scannerOpen} onBarcodeScanned={handleBarcodeScanned} onClose={handleScannerClose} scannerError={scannerError} onRetry={handleScannerRetry} />
      <DivisionConfirmDialogs
        pendingTeamRemoval={pendingTeamRemoval}
        onConfirmRemoveTeam={handleConfirmRemoveTeam}
        onCloseRemoveTeam={() => setPendingTeamRemoval(null)}
        removeTeamIsPending={removeTeam.isPending}
        pendingJornadaDelete={pendingJornadaDelete}
        onConfirmDeleteJornada={handleConfirmDeleteJornada}
        onCloseDeleteJornada={() => setPendingJornadaDelete(null)}
        deleteJornadaIsPending={deleteJornada.isPending}
        showDeletePlayoffsConfirm={showDeletePlayoffsConfirm}
        onConfirmDeletePlayoffs={handleConfirmDeletePlayoffs}
        onCloseDeletePlayoffs={() => setShowDeletePlayoffsConfirm(false)}
        deleteRondasIsPending={deleteRondas.isPending}
        showResetConfirm={showResetConfirm}
        onConfirmReset={handleConfirmReset}
        onCloseReset={() => setShowResetConfirm(false)}
        resetDivisionIsPending={resetDivision.isPending}
        isGeneratingJornada={isGeneratingJornada}
      />

      <DivisionInfoSheet
        visible={infoSheetOpen}
        onClose={() => setInfoSheetOpen(false)}
        nombre={division.nombre}
        assignedTeamCount={assignedTeams.length}
        maxEquipos={division.maxEquipos}
        estadoNombre={estadoNombre}
        isBorrador={isBorrador}
        tipoCompNombre={tipoCompNombre}
        categoriaNombre={resolveNombre(lookups.categorias, division.categoriaId)}
        tipoNombre={resolveNombre(lookups.tipos, division.tipoId)}
        arbitraje={division.arbitraje}
        diasPartido={division.diasPartido}
        horarioPartido={division.horarioPartido}
        duracionPartido={division.duracionPartido}
        descanso={division.descanso}
        loading={infoSheetOpen && lookups.isLoading}
      />

      <DivisionActionSheet
        visible={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        isBorrador={isBorrador}
        isEnCurso={isEnCurso}
        estadoNombre={estadoNombre}
        tieneEliminatorias={tieneEliminatorias}
        hasRondas={rondas.length > 0}
        isPending={cambioEstadoMutation.isPending || leagueOptionsLoading || rondasLoading}
        registrarParticipaciones={division.registrarParticipaciones ?? false}
        registrarParticipacionesPending={updateDivision.isPending}
        onToggleRegistrarParticipaciones={handleToggleRegistrarParticipaciones}
        onPublish={handlePublish}
        onRevertToBorrador={handleRevertToBorrador}
        onGeneratePlayoffs={handleGeneratePlayoffs}
        onDeletePlayoffs={handleDeletePlayoffs}
        onReset={handleReset}
        dataLoading={actionSheetOpen && (leagueOptionsLoading || rondasLoading)}
      />
    </AuthGate>
  )
}
