import { useState, useMemo, useRef, useCallback } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
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
import TabLoading from "@/shared/components/TabLoading"
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
import { getPlayoffTeamOptions, type BracketPair, type Siembra } from "@/features/division/utils/playoff"
import { useGoleadores } from "@/features/goleador/hooks/useGoleadores"
import { useAssignCampeon, useDivisionCampeon, useRemoveCampeon } from "@/features/division-campeon/hooks/useDivisionCampeon"
import CampeonBanner from "@/features/division-campeon/components/CampeonBanner"
import CampeonSelectorModal from "@/features/division/components/CampeonSelectorModal"
import { cuadroCompleto as calcularCuadroCompleto, faltaCampeon } from "@/features/division/utils/campeon"
import { divisionTabs, hayPartidosDeEliminatoria } from "@/features/division/utils/competition-format"
import { codigoDeEstado, esSoloLectura, estadoIdPorCodigo } from "@/features/division/utils/estado-liga"
import GoleadoresTable from "@/features/goleador/components/GoleadoresTable"
import { useNavGuard } from "@/shared/hooks/useNavGuard"
import { capabilitiesForDivision, type DivisionTab } from "@/features/division/utils/competition-format"
import AddTeamModeSheet from "@/features/division/components/AddTeamModeSheet"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { useAccountQuota } from "@/features/users/hooks/useAccountQuota"
import { accountQuotaKey, increasesActiveDivisionCapacity, quotaExhaustedMessage, quotaIsExhausted, refreshQuotaAfterError } from "@/features/users/quota"

export default function DivisionDetailScreen() {
  const toast = useToast()
  const guard = useNavGuard()
  const { id: ligaId, divisionId } = useLocalSearchParams<{ id: string; divisionId: string }>()
  const [tab, setTab] = useState<DivisionTab>("equipos")
  const isFocused = useIsFocused()
  const [modalRondas, setModalRondas] = useState(false)
  const [modalCampeon, setModalCampeon] = useState(false)
  const [infoSheetOpen, setInfoSheetOpen] = useState(false)
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [addTeamSheetOpen, setAddTeamSheetOpen] = useState(false)

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
  // La hoja de información también necesita los nombres de cancha para el horario por cancha.
  const { data: league, isLoading: leagueOptionsLoading } = useLeague(ligaId!, isFocused)
  // El formato decide qué pestañas hay y qué datos tiene sentido pedir. Mientras el catálogo
  // carga cae al formato completo, así que el tab bar espera (ver `formatoListo`).
  const capabilities = capabilitiesForDivision(lookups.tiposCompetencia, division?.tipoCompetenciaId)
  const formatoListo = lookups.tiposCompetencia.length > 0
  // Un formato sin la pestaña activa dejaría la pantalla en blanco.
  const registrarGoleo = division?.registrarGoleo !== false
  // Va atada solo al foco, **no a su pestaña**: ahora es esta consulta la que decide si la pestaña
  // de eliminatoria existe. Condicionarla a `activeTab === "eliminatorias"` sería circular, y
  // aterrizar en Equipos no la dispararía nunca, así que la pestaña no aparecería aunque haya cuadro.
  const { data: rondas = [], isLoading: rondasLoading, error: rondasError } = useRondasPlayoff(divisionId!, isFocused)
  const hayCuadro = hayPartidosDeEliminatoria(rondas)
  // El `useMemo` no es por rendimiento: sin él este arreglo vive desde acá hasta el TabBar, y su
  // ámbito engloba al `useMemo` de los pasos del tour, que el compilador de React ya no puede
  // preservar.
  const tabKeys = useMemo(() => divisionTabs(capabilities.tabs, registrarGoleo, hayCuadro), [capabilities.tabs, registrarGoleo, hayCuadro])
  const activeTab: DivisionTab = tabKeys.includes(tab) ? tab : tabKeys[0]
  const { data: links = [], isLoading: linksLoading, error: linksError, refetch: refetchLinks } = useDivisionEquipos(divisionId!)
  const removeTeam = useRemoveTeam()
  const { data: jornadas = [], isLoading: jornadasLoading, error: jornadasError, refetch: refetchJornadas } = useJornadas(divisionId!, isFocused && capabilities.faseLiga && (activeTab === "jornadas" || activeTab === "programacion"))
  const deleteJornada = useDeleteJornada()
  const setHabilitados = useDivisionScheduleStore((s) => s.setHabilitados)
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const schedules = useDivisionScheduleStore((s) => s.schedules)
  const { data: standings = [], isLoading: standingsLoading, error: standingsError } = useTablaPosiciones(divisionId!, isFocused && capabilities.faseLiga && activeTab === "posiciones")
  const goleadores = useGoleadores(divisionId, registrarGoleo && isFocused && (activeTab === "goleo" || actionSheetOpen || modalCampeon))
  // No va atada a una pestaña: el banner vive en Eliminatoria y el subtítulo del menú de opciones
  // necesita el nombre del campeón esté donde esté el usuario.
  const { data: campeon = null } = useDivisionCampeon(divisionId, isFocused)
  const assignCampeon = useAssignCampeon()
  const removeCampeon = useRemoveCampeon()
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
  const [showRemoveCampeonConfirm, setShowRemoveCampeonConfirm] = useState(false)
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
  const { data: quota } = useAccountQuota(league?.userId)
  const tipoCompNombre = resolveNombre(lookups.tiposCompetencia, division?.tipoCompetenciaId ?? "")
  const tieneEliminatorias = capabilities.eliminatorias
  const hasPlayoffs = tieneEliminatorias && rondas.length > 0
  const ligaCompletada = calcularCuadroCompleto(rondas)

  // El nombre es solo la etiqueta que se muestra; la lógica va por el código, que no cambia
  // aunque un administrador renombre el catálogo.
  const estadoNombre = resolveNombre(lookups.estadosLiga, division?.estadoLigaId ?? "")
  const estadoCodigo = codigoDeEstado(lookups.estadosLiga, division?.estadoLigaId)
  const isBorrador = estadoCodigo === "BORRADOR"
  const isEnCurso = estadoCodigo === "EN_CURSO"
  const isSoloLectura = esSoloLectura(estadoCodigo)
  // Arriba de las pestañas y no dentro de Eliminatoria: también hace falta cuando la final la
  // cerró un árbitro por QR, y ahí el dueño no vio ningún modal.
  const avisoCampeon = faltaCampeon(rondas, campeon)
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
      qc.invalidateQueries({ queryKey: accountQuotaKey })
      const nuevoCodigo = codigoDeEstado(lookups.estadosLiga, updated.estadoLigaId)
      toast.success(
        nuevoCodigo === "BORRADOR" ? "División regresada a borrador"
          : nuevoCodigo === "EN_CURSO" ? "División en curso"
          : "Estado actualizado",
      )
    },
    onError: (e: any) => {
      refreshQuotaAfterError(qc, e)
      toast.error(e.message)
    },
  })

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["division", divisionId] }),
        qc.invalidateQueries({ queryKey: ["division-equipos", divisionId] }),
        qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] }),
        activeTab === "jornadas" || activeTab === "programacion" ? qc.invalidateQueries({ queryKey: ["jornadas", divisionId] }) : Promise.resolve(),
        activeTab === "programacion" ? qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] }) : Promise.resolve(),
        activeTab === "posiciones" ? qc.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] }) : Promise.resolve(),
        activeTab === "goleo" ? qc.invalidateQueries({ queryKey: ["goleadores", divisionId] }) : Promise.resolve(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, divisionId, activeTab])

  const {
    scannerOpen,
    scannerError,
    scannerMode,
    pendingReplacement,
    assignTeamIsPending,
    replaceTeamIsPending,
    handleBarcodeScanned,
    handleScannerRetry,
    handleScannerClose,
    handleScannerOpen,
    confirmReplacement,
    cancelReplacement,
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
    faseLiga: capabilities.faseLiga,
    // "jornadas" no existe en el formato de cuadro; ahí lo útil es ver los cruces ya fechados.
    onGenerated: () => setTab(capabilities.faseLiga ? "jornadas" : "eliminatorias"),
  })

  const tourBlocked = refreshing || scannerOpen || addTeamSheetOpen || pendingReplacement !== null || modalRondas || infoSheetOpen || actionSheetOpen || pendingTeamRemoval !== null || pendingJornadaDelete !== null || showDeletePlayoffsConfirm || showResetConfirm || assignTeamIsPending || replaceTeamIsPending || removeTeam.isPending || isGeneratingJornada || deleteJornada.isPending || generateRondas.isPending || deleteRondas.isPending || resetDivision.isPending || cambioEstadoMutation.isPending
  const tourDataLoading = loadDiv || linksLoading || jornadasLoading || rondasLoading || standingsLoading || lookups.isLoading
  const tourDataError = divError || linksError || jornadasError || rondasError || standingsError

  const switchTourTab = useCallback((nextTab: DivisionTab) => {
    setTab(nextTab)
    requestAnimationFrame(() => scrollRef.current?.scrollTo?.({ y: 0, animated: false }))
  }, [])

  const getCurrentTourScrollOffset = useCallback(() => scrollOffsetRef.current, [])
  const handleTourEnd = useCallback(() => switchTourTab("equipos"), [switchTourTab])

  const tourSteps = useMemo<TourStep[]>(() => {
    // El recorrido encadena pestañas con onNext/onPrev, así que los pasos de las pestañas que
    // el formato no tiene se saltan y la cadena se vuelve a unir con el paso que sí sigue.
    const conFaseLiga = capabilities.faseLiga
    const trasProgramacion: DivisionTab | null = conFaseLiga ? "jornadas" : hasPlayoffs ? "eliminatorias" : null
    const antesDeEliminatorias: DivisionTab = conFaseLiga ? "posiciones" : "programacion"

    const steps: TourStep[] = [
      { id: "division-detail-info", targetRef: infoActionRef, title: "Consulta la configuración", description: "Aquí revisas el estado, la categoría, el tipo de competencia, el arbitraje y los horarios de esta división.", spotlightPadding: 8, tooltipPosition: "bottom" },
      { id: "division-detail-options", targetRef: optionsActionRef, title: "Administra la división", description: "Desde aquí puedes publicar o volver a borrador, crear o eliminar eliminatorias y reiniciar la temporada.", spotlightPadding: 8, tooltipPosition: "bottom" },
      { id: "division-detail-tabs", targetRef: tabBarRef, title: "Tu flujo de competencia", description: conFaseLiga ? "Trabaja en orden: agrega equipos, configura la programación, consulta las jornadas y revisa las posiciones." : "Trabaja en orden: agrega equipos, genera el cuadro y programa sus partidos.", spotlightPadding: 8, tooltipPosition: "bottom" },
      { id: "division-detail-teams", targetRef: teamsSectionRef, title: assignedTeams.length === 0 ? "Agrega equipos" : "Elige quién juega", description: assignedTeams.length === 0 ? "Escanea el código QR de un equipo para incorporarlo a esta división." : "Marca los equipos con arbitraje pagado. Solo los seleccionados participarán en la próxima jornada.", spotlightPadding: 8, tooltipPosition: "top", onNext: () => switchTourTab("programacion") },
      { id: "division-detail-schedule", targetRef: scheduleSectionRef, title: "Prepara la jornada", description: "Configura fechas, horarios, equipos y, cuando aplique, cancha y árbitro antes de generar la jornada.", spotlightPadding: 8, tooltipPosition: "top", delayBefore: 500, onPrev: () => switchTourTab("equipos"), onNext: trasProgramacion ? () => switchTourTab(trasProgramacion) : undefined },
      // Spread condicional, no `push`: el compilador de React no deja tocar refs fuera de un
      // literal durante el render.
      ...(conFaseLiga ? [
        { id: "division-detail-rounds", targetRef: jornadasSectionRef, title: jornadas.length === 0 ? "Consulta las jornadas" : "Captura resultados", description: jornadas.length === 0 ? "Las jornadas que generes aparecerán aquí para consultar y capturar sus partidos." : "Abre una jornada para actualizar sus partidos. Solo la jornada más reciente puede eliminarse.", spotlightPadding: 8, tooltipPosition: "top", delayBefore: 350, onPrev: () => switchTourTab("programacion"), onNext: () => switchTourTab("posiciones") },
        { id: "division-detail-standings", targetRef: standingsSectionRef, title: "Sigue la tabla", description: standings.length === 0 ? "Las posiciones aparecerán cuando existan resultados registrados." : "La tabla se calcula con los resultados y también puedes descargarla en PDF.", spotlightPadding: 8, tooltipPosition: "top", delayBefore: 350, onPrev: () => switchTourTab("jornadas"), onNext: hasPlayoffs ? () => switchTourTab("eliminatorias") : undefined },
      ] as TourStep[] : []),
      ...(hasPlayoffs ? [{ id: "division-detail-playoffs", targetRef: playoffsSectionRef, title: "Sigue las eliminatorias", description: "Abre cada ronda para revisar sus cruces y entra a un partido para registrar el resultado.", spotlightPadding: 8, tooltipPosition: "top" as const, delayBefore: 400, onPrev: () => switchTourTab(antesDeEliminatorias) }] : []),
    ]
    return steps
  }, [assignedTeams.length, capabilities.faseLiga, jornadas.length, standings.length, hasPlayoffs, switchTourTab])

  useTour({
    tourId: "division-detail-v1",
    isFocused,
    isBlocked: tourBlocked,
    isEnabled: !tourDataLoading && !tourDataError && !!division && !!session?.user && activeTab === "equipos",
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
    if (quotaIsExhausted(quota, "activeDivisions")) {
      toast.info(quotaExhaustedMessage("activeDivisions"))
      return
    }
    setActionSheetOpen(false)
    const enCursoId = estadoIdPorCodigo(lookups.estadosLiga, "EN_CURSO")
    if (enCursoId) cambioEstadoMutation.mutate(enCursoId)
  }, [lookups, cambioEstadoMutation, quota, toast])

  const handleReabrir = useCallback(() => {
    if (quotaIsExhausted(quota, "activeDivisions")) {
      toast.info(quotaExhaustedMessage("activeDivisions"))
      return
    }
    setActionSheetOpen(false)
    const enCursoId = estadoIdPorCodigo(lookups.estadosLiga, "EN_CURSO")
    if (enCursoId) cambioEstadoMutation.mutate(enCursoId)
  }, [lookups, cambioEstadoMutation, quota, toast])

  const handleRevertToBorrador = useCallback(() => {
    setActionSheetOpen(false)
    const borradorId = estadoIdPorCodigo(lookups.estadosLiga, "BORRADOR")
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
    const resetTargetCode = isSoloLectura ? "EN_CURSO" : estadoCodigo ?? ""
    if (increasesActiveDivisionCapacity(estadoCodigo, resetTargetCode) && quotaIsExhausted(quota, "activeDivisions")) {
      toast.info(quotaExhaustedMessage("activeDivisions"))
      return
    }
    setActionSheetOpen(false)
    setShowResetConfirm(true)
  }, [estadoCodigo, isSoloLectura, quota, toast])

  const handleAssignCampeon = useCallback(() => {
    setActionSheetOpen(false)
    setModalCampeon(true)
  }, [])

  const handleRemoveCampeon = useCallback(() => {
    setActionSheetOpen(false)
    setShowRemoveCampeonConfirm(true)
  }, [])

  const handleSelectCampeon = useCallback((equipoId: string, jugadorId: string | null) => {
    setModalCampeon(false)
    assignCampeon.mutate({ divisionId: divisionId!, equipoId, jugadorId }, {
      onSuccess: () => toast.success("Campeón asignado"),
      onError: (error: Error) => toast.error(error.message),
    })
  }, [assignCampeon, divisionId, toast])

  const handleConfirmRemoveCampeon = useCallback(() => {
    setShowRemoveCampeonConfirm(false)
    removeCampeon.mutate({ divisionId: divisionId!, equipoId: campeon?.equipoId, jugadorId: campeon?.jugadorId }, {
      onSuccess: () => toast.success("Campeón quitado"),
      onError: (error: Error) => toast.error(error.message),
    })
  }, [campeon?.equipoId, campeon?.jugadorId, divisionId, removeCampeon, toast])


  const handleToggleRegistrarParticipaciones = useCallback((value: boolean) => {
    updateDivision.mutate(
      { id: divisionId!, data: { registrarParticipaciones: value } },
      {
        onSuccess: () => toast.success(value ? "Registro de participantes activado" : "Registro de participantes desactivado"),
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [divisionId, toast, updateDivision])

  /**
   * Qué campo se está guardando ahora mismo, para que solo su control muestre el spinner.
   * Antes los tres recibían `updateDivision.isPending` y cualquier guardado los parpadeaba a
   * todos. Sale de la propia mutación, así que no hay estado que se pueda desincronizar; se lee
   * detrás de `isPending` porque `variables` conserva el último valor tras terminar.
   */
  const guardandoCampo = updateDivision.isPending ? updateDivision.variables?.data : undefined

  const handleChangeMinPartidos = useCallback((value: number) => {
    updateDivision.mutate(
      { id: divisionId!, data: { minPartidosEliminatoria: value } },
      {
        onSuccess: () => toast.success(value > 0
          ? `Se exigirán ${value} partidos para alinear en eliminatorias`
          : "Sin mínimo de partidos para eliminatorias"),
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [divisionId, toast, updateDivision])

  const handleToggleRegistrarGoleo = useCallback((value: boolean) => {
    updateDivision.mutate(
      { id: divisionId!, data: { registrarGoleo: value } },
      {
        onSuccess: () => toast.success(value ? "Tabla de goleo activada" : "Tabla de goleo desactivada"),
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [divisionId, toast, updateDivision])

  const handleSelectPlayoffTeams = useCallback((n: number, siembra: Siembra, llaves?: BracketPair[]) => {
    if (generatingLlaves.current || !division) return
    generatingLlaves.current = true
    setModalRondas(false)
    generateRondas.mutate({ divisionId: divisionId!, leagueId: ligaId, cantidadEquipos: n, siembra, llaves }, {
      onSuccess: () => {
        try {
          // Solo el cascarón: sin una programación creada, `replaceSlots` no tiene dónde escribir
          // y el manager nunca podría llenarla. Los slots del cuadro los crea él, que es el único
          // que conoce las canchas y su disponibilidad.
          if (!schedules[divisionId!]) {
            useDivisionScheduleStore.getState().initSchedule(
              divisionId!, division.diasPartido ?? "sab", division.horarioPartido ?? "08:00-20:00",
              division.duracionPartido ?? 60, division.descanso ?? 0, undefined, 0, [],
            )
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
      { id: pendingJornadaDelete.jornadaId, divisionId: divisionId!, leagueId: ligaId, faseLiga: capabilities.faseLiga },
      {
        onSuccess: () => {
          setPendingJornadaDelete(null)
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }, [capabilities.faseLiga, divisionId, ligaId, pendingJornadaDelete, deleteJornada, toast])

  const handleConfirmDeletePlayoffs = useCallback(() => {
    // Se cierra al confirmar: el aviso lo da el overlay de "Eliminando eliminatorias...".
    setShowDeletePlayoffsConfirm(false)
    deleteRondas.mutate({ divisionId: divisionId!, leagueId: ligaId }, {
      onSuccess: () => {
        clearEliminatoriaSlots(divisionId!)
        setPlayoffMode(divisionId!, false)
        // Sin partidos la pestaña Eliminatoria desaparece, así que no se puede volver a ella: hay
        // que mandar al usuario a una que exista. En un cuadro puro tampoco hay Jornada, y ahí lo
        // útil es Programación. Para generar el cuadro de nuevo está el menú de opciones.
        setTab(capabilities.faseLiga ? "jornadas" : "programacion")
      },
      onError: (error: Error) => toast.error(error.message),
    })
  }, [capabilities.faseLiga, divisionId, ligaId, deleteRondas, clearEliminatoriaSlots, setPlayoffMode, setTab, toast])

  const handleConfirmReset = useCallback(() => {
    // Se cierra al confirmar: el aviso lo da el overlay de "Reiniciando división...", y dejar el
    // confirmador abierto apilaría dos modales.
    setShowResetConfirm(false)
    resetDivision.mutate({ divisionId: divisionId!, leagueId: ligaId! }, {
      onError: (error: Error) => toast.error(error.message),
    })
  }, [divisionId, ligaId, resetDivision, toast])

  if (loadDiv) {
    return <View style={{ flex: 1, backgroundColor: Palette.black }}><CustomHeader title="División" onBack={() => router.back()} /><LoadingScreen /></View>
  }

  if (divError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="División" onBack={() => router.back()} />
        <ErrorState message={(divError as Error).message} onRetry={() => refetchDiv()} fullScreen />
      </View>
    )
  }

  if (!division) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="División" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
          <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.xl, alignItems: "center", borderWidth: 1, borderColor: Palette.border }}>
            <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.sans }}>División no encontrada</Text>
          </View>
        </View>
      </View>
    )
  }

  const TAB_LABELS: Record<DivisionTab, string> = {
    equipos: "Equipo",
    programacion: "Programación",
    jornadas: "Jornada",
    posiciones: "Posiciones",
    goleo: "Goleo",
    eliminatorias: "Eliminatoria",
  }
  const tabs = tabKeys.map((key) => ({ key, label: TAB_LABELS[key] }))

  /**
   * Un solo indicador para las pestañas de datos. Los booleanos ya existían —solo alimentaban al
   * tour— y cada pestaña resolvía su carga a su manera, o no la resolvía.
   *
   * Programación queda fuera a propósito: es el editor de horarios, con su propio ciclo, no una
   * vista de datos. Y una consulta deshabilitada no reporta `isLoading`, así que esto no se
   * enciende por una pestaña que no se está mirando.
   */
  const CARGA_POR_TAB: Record<DivisionTab, boolean> = {
    equipos: linksLoading,
    jornadas: jornadasLoading,
    posiciones: standingsLoading,
    goleo: goleadores.isLoading,
    eliminatorias: rondasLoading,
    programacion: false,
  }
  const tabCargando = CARGA_POR_TAB[activeTab]

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader
          title={division.nombre}
          onBack={() => router.back()}
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
            {avisoCampeon ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setModalCampeon(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.warning10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.warning, padding: Pad.base }}
              >
                <MaterialIcons name="workspace-premium" size={22} color={Palette.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.warning, fontSize: 14, fontFamily: Fonts.semiBold }}>Falta asignar al campeón</Text>
                  <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>El cuadro terminó. Toca para elegir al ganador.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Palette.warning} />
              </TouchableOpacity>
            ) : null}

            <View ref={tabBarRef} collapsable={false} onLayout={() => setTabBarReady(true)}>
              {/* Sin el catálogo cargado el formato es desconocido: mostrar las pestañas de liga
                  y quitarlas al llegar el dato se ve como un parpadeo. */}
              {formatoListo ? (
                <TabBar tabs={tabs} activeTab={activeTab} onTabChange={(key) => setTab(key as DivisionTab)} />
              ) : (
                <View style={{ height: 44, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md }} />
              )}
            </View>

            {tabCargando ? <TabLoading nombre={TAB_LABELS[activeTab]} /> : null}

            {activeTab === "equipos" && !tabCargando ? (
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
                  onAddPress={() => setAddTeamSheetOpen(true)}
                  onToggleSelectAll={() => { const all = assignedTeams.map((t) => t.id); const current = habilitados ?? []; setHabilitados(divisionId!, current.length === all.length ? [] : all) }}
                  linksError={linksError}
                  refetchLinks={refetchLinks}
                />
              </View>
            ) : null}

            {activeTab === "jornadas" && !tabCargando ? (
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

            {activeTab === "posiciones" && !tabCargando ? (
              <View ref={standingsSectionRef} collapsable={false}>
                <PosicionesTab
                  divisionNombre={division.nombre}
                  standings={standings}
                  standingsLoading={standingsLoading}
                />
              </View>
            ) : null}

            {activeTab === "goleo" && !tabCargando ? <GoleadoresTable data={goleadores.data} isLoading={goleadores.isLoading} error={goleadores.error} /> : null}

            {activeTab === "eliminatorias" && tieneEliminatorias && !tabCargando ? (
              <View ref={playoffsSectionRef} collapsable={false}>
                {rondasError ? (
                  <ErrorState message={(rondasError as Error).message} />
                ) : rondas.length > 0 ? (
                  <View style={{ gap: Gap.lg }}>
                    {campeon ? <CampeonBanner campeon={campeon} /> : null}
                    <EliminatoriasTab
                      rondas={rondas}
                      onPartidoPress={(partido) => guard(() => router.push(`/(drawer)/leagues/${ligaId}/divisions/${divisionId}/partidos/${partido.id}`))}
                    />
                  </View>
                ) : (
                  <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.xl, alignItems: "center", gap: Gap.md, borderWidth: 1, borderColor: Palette.border }}>
                    <MaterialIcons name="emoji-events" size={40} color={Palette.textMuted} />
                    <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans, textAlign: "center" }}>
                      {opcionesEquipos.length > 0
                        ? "Aún no se ha generado el cuadro de eliminatorias."
                        : "Asigna al menos 2 equipos a la división para generar el cuadro."}
                    </Text>
                    {/* Ofrecer el botón sin equipos suficientes solo llevaría a un error del servidor. */}
                    {opcionesEquipos.length > 0 ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => guard(() => setModalRondas(true))}
                        style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingHorizontal: Pad.base, paddingVertical: Pad.md }}
                      >
                        <MaterialIcons name="account-tree" size={18} color={Palette.black} />
                        <Text style={{ color: Palette.black, fontSize: 14, fontFamily: Fonts.semiBold }}>Generar eliminatorias</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === "programacion" ? (
              <View ref={scheduleSectionRef} collapsable={false}>
                <DivisionScheduleManager
                  divisionId={divisionId!}
                  faseLiga={capabilities.faseLiga}
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

      {/* La key remonta la hoja en cada apertura: conservar el borrador haría creer que ese
          cuadro sigue vigente aunque hayan cambiado los equipos de la división. */}
      <PlayoffTeamSelectorModal
        key={modalRondas ? "cuadro-abierto" : "cuadro-cerrado"}
        visible={modalRondas}
        onClose={() => setModalRondas(false)}
        opcionesEquipos={opcionesEquipos}
        equipos={assignedTeams}
        permiteSiembraPorPosiciones={capabilities.faseLiga}
        siembraPorDefecto={capabilities.siembraPorDefecto}
        generateRondasIsPending={generateRondas.isPending}
        onSelect={handleSelectPlayoffTeams}
      />

      {/* Igual que el de eliminatorias: la key lo remonta en cada apertura, así el paso vuelve a
          empezar en el equipo y la sugerencia se recalcula con los datos frescos. */}
      <CampeonSelectorModal
        key={modalCampeon ? "campeon-abierto" : "campeon-cerrado"}
        visible={modalCampeon}
        onClose={() => setModalCampeon(false)}
        equipos={assignedTeams}
        rondas={rondas}
        goleadores={registrarGoleo ? goleadores.data?.rows ?? [] : []}
        goleadoresLoading={registrarGoleo && goleadores.isLoading}
        isPending={assignCampeon.isPending}
        onSelect={handleSelectCampeon}
      />

      <AddTeamModeSheet
        key={addTeamSheetOpen ? "agregar-abierto" : "agregar-cerrado"}
        visible={addTeamSheetOpen}
        assignedTeams={assignedTeams}
        onAddNew={() => {
          setAddTeamSheetOpen(false)
          handleScannerOpen()
        }}
        onReplace={(teamId) => {
          const source = assignedTeams.find((team) => team.id === teamId)
          if (!source) return
          setAddTeamSheetOpen(false)
          handleScannerOpen(source)
        }}
        onClose={() => setAddTeamSheetOpen(false)}
      />
      <QRScannerModal
        visible={scannerOpen}
        onBarcodeScanned={handleBarcodeScanned}
        onClose={handleScannerClose}
        scannerError={scannerError}
        onRetry={handleScannerRetry}
        promptText={scannerMode === "replacement" ? "Escanea el QR del equipo reemplazante" : undefined}
      />
      <ConfirmationModal
        visible={pendingReplacement !== null}
        title="Reemplazar equipo"
        message={pendingReplacement ? `¿Reemplazar "${pendingReplacement.source.nombre}" por "${pendingReplacement.target.nombre}"? Se conservarán las jornadas, resultados, puntos, goles, saldo y eliminatorias.` : ""}
        highlightText={pendingReplacement?.target.nombre}
        confirmLabel="Reemplazar"
        variant="warning"
        loading={replaceTeamIsPending}
        onConfirm={confirmReplacement}
        onClose={cancelReplacement}
      />
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
        showRemoveCampeonConfirm={showRemoveCampeonConfirm}
        onConfirmRemoveCampeon={handleConfirmRemoveCampeon}
        onCloseRemoveCampeon={() => setShowRemoveCampeonConfirm(false)}
        removeCampeonIsPending={removeCampeon.isPending}
        isGeneratingJornada={isGeneratingJornada}
        generateRondasIsPending={generateRondas.isPending}
        assignCampeonIsPending={assignCampeon.isPending}
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
        canchaHorarios={division.canchaHorarios}
        canchas={league?.canchas}
        loading={infoSheetOpen && lookups.isLoading}
      />

      <DivisionActionSheet
        visible={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        isBorrador={isBorrador}
        isEnCurso={isEnCurso}
        isSoloLectura={isSoloLectura}
        estadoNombre={estadoNombre}
        tieneEliminatorias={tieneEliminatorias}
        hasRondas={rondas.length > 0}
        cuadroCompleto={ligaCompletada}
        nombreCampeon={campeon?.equipoNombre ?? null}
        isPending={cambioEstadoMutation.isPending || leagueOptionsLoading || rondasLoading}
        registrarParticipaciones={division.registrarParticipaciones ?? false}
        registrarParticipacionesPending={guardandoCampo?.registrarParticipaciones !== undefined}
        onToggleRegistrarParticipaciones={handleToggleRegistrarParticipaciones}
        registrarGoleo={registrarGoleo}
        registrarGoleoPending={guardandoCampo?.registrarGoleo !== undefined}
        onToggleRegistrarGoleo={handleToggleRegistrarGoleo}
        minPartidosEliminatoria={division?.minPartidosEliminatoria ?? 0}
        minPartidosPending={guardandoCampo?.minPartidosEliminatoria !== undefined}
        onChangeMinPartidos={handleChangeMinPartidos}
        onPublish={handlePublish}
        onRevertToBorrador={handleRevertToBorrador}
        onGeneratePlayoffs={handleGeneratePlayoffs}
        onDeletePlayoffs={handleDeletePlayoffs}
        onAssignCampeon={handleAssignCampeon}
        onRemoveCampeon={handleRemoveCampeon}
        onReabrir={handleReabrir}
        onReset={handleReset}
        dataLoading={actionSheetOpen && (leagueOptionsLoading || rondasLoading)}
      />
    </AuthGate>
  )
}
