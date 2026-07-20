import { useState, useMemo, useRef, useCallback } from "react"
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Pad, Gap, Fonts, Radius } from "@/constants/theme"
import type { BarcodeScanningResult } from "expo-camera"
import { useDivisionEquipos, useAssignTeam, useRemoveTeam } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useTeams } from "@/features/team/hooks/useTeams"
import { useJornadas, useGenerateNextJornada, useDeleteJornada } from "@/features/jornada/hooks/useJornadas"
import { useLookups } from "@/features/league/hooks/useLookups"
import { resolveNombre } from "@/shared/utils/resolve-lookup"
import { divisionApi } from "@/features/division/api/divisions"
import DivisionInfoCard from "@/features/division/components/DivisionInfoCard"
import TeamListCard from "@/features/division/components/TeamListCard"
import JornadaListCard from "@/features/jornada/components/JornadaListCard"
import QRScannerModal from "@/shared/components/QRScannerModal"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { AuthGate } from "@/shared/components/AuthGate"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { useToast } from "@/shared/components/Toast"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useDivisionScheduleStore, getActiveSlots } from "@/stores/divisionSchedule"
import { useRondasPlayoff, useGenerateRondas, useDeleteRondasByDivision } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import { useResetDivision } from "@/features/division/hooks/useDivisions"
import { partidoApi } from "@/features/partido/api/partidos"
import { parseDiasPartido } from "@/shared/utils/parse-dias-partido"
import { TabBar } from "@/shared/components/TabBar"
import DivisionScheduleManager from "@/features/division/components/DivisionScheduleManager"
import StandingsTable from "@/features/tabla-posicion/components/StandingsTable"
import { useTablaPosiciones } from "@/features/tabla-posicion/hooks/useTablaPosiciones"
import { downloadPdf, standingsHtml } from "@/shared/utils/print-pdf"

function formatDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function DivisionDetailScreen() {
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 32 : 0)
  const { id: ligaId, divisionId } = useLocalSearchParams<{ id: string; divisionId: string }>()

  const { data: division, isLoading: loadDiv, error: divError, refetch: refetchDiv } = useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId!),
    enabled: !!divisionId,
  })
  const lookups = useLookups()
  const { data: links = [], error: linksError, refetch: refetchLinks } = useDivisionEquipos(divisionId!)
  const { data: allTeams = [] } = useTeams()
  const assignTeam = useAssignTeam()
  const removeTeam = useRemoveTeam()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState("")
  const scanningLocked = useRef(false)
  const { data: jornadas = [], error: jornadasError, refetch: refetchJornadas } = useJornadas(divisionId!)
  const generateNext = useGenerateNextJornada()
  const deleteJornada = useDeleteJornada()
  const schedule = useDivisionScheduleStore((s) => (divisionId ? s.schedules[divisionId] : undefined))
  const setHabilitados = useDivisionScheduleStore((s) => s.setHabilitados)
  const habilitados = useDivisionScheduleStore((s) => (divisionId ? s.habilitados[divisionId] : undefined))
  const schedules = useDivisionScheduleStore((s) => s.schedules)
  const guardarProgramacion = useDivisionScheduleStore((s) => s.guardarProgramacion)
  const advanceSchedule = useDivisionScheduleStore((s) => s.advanceSchedule)
  const rewindSchedule = useDivisionScheduleStore((s) => s.rewindSchedule)
  const { data: rondas = [] } = useRondasPlayoff(divisionId!)
  const { data: standings = [], isLoading: standingsLoading } = useTablaPosiciones(divisionId!)
  const playoffMode = rondas.length > 0
  const generateRondas = useGenerateRondas()
  const deleteRondas = useDeleteRondasByDivision()
  const resetDivision = useResetDivision()
  const generatingLlaves = useRef(false)
  const clearEliminatoriaSlots = useDivisionScheduleStore((s) => s.clearEliminatoriaSlots)
  const resetSchedule = useDivisionScheduleStore((s) => s.resetSchedule)
  const qc = useQueryClient()
  const [modalRondas, setModalRondas] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState("equipos")
  const tipoCompNombre = resolveNombre(lookups.tiposCompetencia, division?.tipoCompetenciaId ?? "")
  const tieneEliminatorias = tipoCompNombre.includes("Eliminatorias")
  const ultimaRonda = useMemo(() =>
    rondas.length > 0 ? rondas.reduce((max, r) => r.orden > max.orden ? r : max, rondas[0]) : null,
    [rondas],
  )
  const { data: partidosUltimaRonda = [] } = useQuery({
    queryKey: ["partidos-ultima-ronda", ultimaRonda?.id],
    queryFn: () => partidoApi.findByRondaPlayoff(ultimaRonda!.id),
    enabled: !!ultimaRonda,
  })
  const ligaCompletada = partidosUltimaRonda.length > 0 &&
    partidosUltimaRonda.every((p: any) => p.estado === "FINALIZADO")

  const estadoNombre = resolveNombre(lookups.estadosLiga, division?.estadoLigaId ?? "")
  const isBorrador = estadoNombre === "Borrador"
  const isEnCurso = estadoNombre === "En Curso"
  const cambioEstadoMutation = useMutation({
    mutationFn: (nuevoEstadoId: string) => divisionApi.update(divisionId!, { estadoLigaId: nuevoEstadoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["division", divisionId] })
      qc.invalidateQueries({ queryKey: ["divisions"] })
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
        qc.invalidateQueries({ queryKey: ["teams"] }),
        qc.invalidateQueries({ queryKey: ["jornadas", divisionId] }),
        qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] }),
        qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] }),
        qc.invalidateQueries({ queryKey: ["partidos-ultima-ronda"] }),
        qc.invalidateQueries({ queryKey: ["partidos-ronda"] }),
        qc.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] }),
        qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, divisionId])

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanningLocked.current) return
    scanningLocked.current = true
    const equipoId = data.trim()
    const teamExists = allTeams.find((t) => t.id === equipoId)
    if (teamExists) {
      if (links.some((l) => l.equipoId === equipoId)) {
        setScannerError(`"${teamExists.nombre}" ya está en esta división`)
        return
      }
      handleAssign(equipoId)
      handleScannerClose()
    } else {
      setScannerError("No se encontró ningún equipo con ese código")
    }
  }

  const handleScannerRetry = () => {
    setScannerError("")
    scanningLocked.current = false
  }

  const handleScannerClose = () => {
    setScannerOpen(false)
    setScannerError("")
    scanningLocked.current = false
  }

  const handleScannerOpen = () => {
    setScannerError("")
    scanningLocked.current = false
    setScannerOpen(true)
  }

  const assignedTeams = useMemo(
    () => allTeams.filter((t) => links.some((l) => l.equipoId === t.id)),
    [allTeams, links],
  )
  const opcionesEquipos = useMemo(() => {
    const total = assignedTeams.length
    return [4, 8, 16].filter((n) => n <= total)
  }, [assignedTeams.length])
  const handleAssign = (equipoId: string) => {
    assignTeam.mutate(
      { divisionId: divisionId!, equipoId },
      { onSuccess: () => toast.success("Equipo asignado"), onError: (e: any) => toast.error(e.message) },
    )
  }

  const handleRemove = (nombre: string, equipoId: string) => {
    Alert.alert("Quitar equipo", `¿Quitar "${nombre}" de la división?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: () => removeTeam.mutate(
          { divisionId: divisionId!, equipoId },
          { onSuccess: () => toast.success("Equipo quitado") },
        ),
      },
    ])
  }

  const handleToggleArbitraje = (id: string) => {
    const current = useDivisionScheduleStore.getState().habilitados[divisionId!] ?? []
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setHabilitados(divisionId!, next)
  }

  const handleGenerateJornada = () => {
    if (ligaCompletada) {
      toast.info("Temporada completada. Reinicia la división para continuar.")
      return
    }
    if (!schedule) {
      toast.error("Primero configura la programación de la jornada")
      return
    }
    if (!habilitados || habilitados.length < 2) {
      toast.error("Marca al menos 2 equipos que pagaron arbitraje para generar una jornada")
      return
    }

    const oddCount = habilitados.length % 2 !== 0
    const hasExtraSlots = schedule.slots.some((slot) =>
      slot.id.startsWith('extra-') || slot.tipo === 'amistoso' || slot.tipo === 'complemento'
    )
    if (!playoffMode && oddCount && !hasExtraSlots && !schedule.descansoEquipoId) {
      toast.error("Selecciona qué equipo descansa antes de generar la jornada")
      return
    }

    const habSet = new Set(habilitados)
    const activeSlots = getActiveSlots(schedule.slots, habilitados.length, playoffMode)
    const eliminatoriaTeamIds = new Set<string>()
    for (const slot of schedule.slots) {
      if (slot.tipo !== 'eliminatoria') continue
      if (slot.equipoLocalId) eliminatoriaTeamIds.add(slot.equipoLocalId)
      if (slot.equipoVisitanteId) eliminatoriaTeamIds.add(slot.equipoVisitanteId)
    }

    const slotsParaJornada = activeSlots.map((slot) => ({
      ...slot,
      equipoLocalId: slot.tipo === 'eliminatoria'
        ? slot.equipoLocalId
        : slot.equipoLocalId && habSet.has(slot.equipoLocalId) && !eliminatoriaTeamIds.has(slot.equipoLocalId)
          ? slot.equipoLocalId
          : undefined,
      equipoVisitanteId: slot.tipo === 'eliminatoria'
        ? slot.equipoVisitanteId
        : slot.equipoVisitanteId && habSet.has(slot.equipoVisitanteId) && !eliminatoriaTeamIds.has(slot.equipoVisitanteId)
          ? slot.equipoVisitanteId
          : undefined,
    }))

    generateNext.mutate(
      {
        divisionId: divisionId!,
        slots: slotsParaJornada,
        equipoIds: habilitados,
        descansoEquipoId: schedule.descansoEquipoId,
      },
      {
        onSuccess: (jornadaCreada) => {
          guardarProgramacion(divisionId!)
          clearEliminatoriaSlots(divisionId!)
          const jornadaFecha = jornadaCreada.fechaInicio ?? (() => {
            const fechas = slotsParaJornada.map((slot) => slot.fecha).filter(Boolean) as string[]
            return fechas.length > 0 ? [...fechas].sort()[0] : undefined
          })()
          advanceSchedule(divisionId!, jornadaFecha)
          setHabilitados(divisionId!, [])
          setTab("jornadas")
          toast.success("Jornada generada")
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }

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

  const scheduleItems: { icon: string; label: string; text: string }[] = []
  if (division.diasPartido) scheduleItems.push({ icon: "calendar-today", label: "Días", text: division.diasPartido })
  if (division.horarioPartido) scheduleItems.push({ icon: "access-time", label: "Horario", text: division.horarioPartido })
  if (division.duracionPartido != null) scheduleItems.push({ icon: "timer", label: "Duración", text: `${division.duracionPartido} min por partido` })
  if (division.descanso != null) scheduleItems.push({ icon: "coffee", label: "Descanso", text: `${division.descanso} min de descanso` })

  const tabs = [
    { key: "equipos", label: "Equipo" },
    { key: "programacion", label: "Programación" },
    { key: "jornadas", label: "Jornada" },
    { key: "posiciones", label: "Posiciones" },
    ...(tieneEliminatorias && rondas.length > 0
      ? [{ key: "eliminatorias", label: "Eliminatoria" }]
      : []),
  ]

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="División" />
        <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ padding: Pad.base, gap: Gap.xl, paddingBottom: 48 }}>
            <Text style={{ fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text, textAlign: "center", paddingBottom: Pad.sm }}>{division.nombre}</Text>

            <DivisionInfoCard
              etiquetas={[
                { icon: "category", label: resolveNombre(lookups.categorias, division.categoriaId) },
                { icon: "sports-soccer", label: resolveNombre(lookups.tipos, division.tipoId) },
                { gold: true, label: estadoNombre },
                { icon: "emoji-events", label: resolveNombre(lookups.tiposCompetencia, division.tipoCompetenciaId) },
              ]}
              stats={[
                { icon: "groups", label: "Máx", value: String(division.maxEquipos) },
                { icon: "attach-money", label: "Arb", value: `$${division.arbitraje}` },
                { icon: "how-to-reg", label: "Eq", value: String(assignedTeams.length) },
              ]}
              schedule={scheduleItems}
            >
              <View style={{ gap: Gap.sm }}>
                <Text style={{ fontSize: 12, color: Palette.textSecondary, textAlign: "center", fontFamily: Fonts.sans }}>
                  {isBorrador
                    ? "Presiona publicar para que los usuarios puedan visualizar tu división"
                    : isEnCurso
                      ? "Regresa la división a borrador para ocultarla de los usuarios"
                      : ""}
                </Text>
                <View style={{ flexDirection: "row", gap: Gap.md }}>
                  {isBorrador ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        const enCursoId = lookups.estadosLiga.find((e) => e.nombre === "En Curso")?.id
                        if (enCursoId) cambioEstadoMutation.mutate(enCursoId)
                      }}
                      disabled={cambioEstadoMutation.isPending}
                      style={{ flex: 1, backgroundColor: Palette.success, borderRadius: 12, paddingVertical: Pad.md, alignItems: "center", opacity: cambioEstadoMutation.isPending ? 0.6 : 1 }}
                    >
                      <Text style={{ color: Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>Publicar</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isEnCurso ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        const borradorId = lookups.estadosLiga.find((e) => e.nombre === "Borrador")?.id
                        if (borradorId) cambioEstadoMutation.mutate(borradorId)
                      }}
                      disabled={cambioEstadoMutation.isPending}
                      style={{ flex: 1, backgroundColor: Palette.danger, borderRadius: 12, paddingVertical: Pad.md, alignItems: "center", opacity: cambioEstadoMutation.isPending ? 0.6 : 1 }}
                    >
                      <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Regresar a borrador</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowResetConfirm(true)}
                    style={{ flex: 1, backgroundColor: Palette.danger, borderRadius: 12, paddingVertical: Pad.md, alignItems: "center" }}
                  >
                    <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Reiniciar división</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </DivisionInfoCard>

            <TabBar tabs={tabs} activeTab={tab} onTabChange={setTab} />

            {tab === "equipos" ? (
              <View style={{ gap: Gap.sm }}>
                <Text style={{ color: Palette.textSecondary, fontSize: 12, textAlign: "center", paddingHorizontal: Pad.md, paddingTop: Pad.sm }}>Marca los equipos que ya pagaron el arbitraje - solo esos participarán en la próxima jornada</Text>
                {linksError ? (
                  <ErrorState message={(linksError as Error).message} onRetry={() => refetchLinks()} />
                ) : (
                  <TeamListCard assigned={assignedTeams} arbitrajePagado={habilitados ?? []} onRemove={handleRemove} onToggleArbitraje={handleToggleArbitraje} onQrScan={handleScannerOpen} onToggleSelectAll={() => { const all = assignedTeams.map((t) => t.id); const current = habilitados ?? []; setHabilitados(divisionId!, current.length === all.length ? [] : all) }} flat />
                )}

              </View>
            ) : null}

            {tab === "jornadas" ? (
              <View style={{ gap: Gap.md }}>
                {tieneEliminatorias && rondas.length === 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      if (opcionesEquipos.length === 0) {
                        toast.error("Se necesitan al menos 4 equipos para generar eliminatorias")
                        return
                      }
                      setModalRondas(true)
                    }}
                    style={{
                      backgroundColor: Palette.cyan,
                      borderRadius: Radius.md,
                      paddingVertical: Pad.md,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: Gap.sm,
                    }}
                  >
                    <MaterialIcons name="emoji-events" size={20} color={Palette.dark} />
                    <Text style={{ color: Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>
                      Generar eliminatorias
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {jornadasError ? (
                  <ErrorState message={(jornadasError as Error).message} onRetry={() => refetchJornadas()} />
                ) : (
                  <JornadaListCard
                    jornadas={jornadas}
                    disabled={ligaCompletada}
                    disabledMessage="Temporada completada. Reinicia la liga para continuar."
                    onNavigate={(jornadaId) => router.push(`/(drawer)/leagues/${ligaId}/divisions/${divisionId}/jornadas/${jornadaId}`)}
                    onDelete={(jornadaId, numero) => {
                      Alert.alert("Eliminar jornada", `¿Eliminar Jornada ${numero} y sus partidos?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Eliminar", style: "destructive", onPress: () => {
                          deleteJornada.mutate(
                            { id: jornadaId, divisionId: divisionId! },
                            { onSuccess: () => rewindSchedule(divisionId!) }
                          )
                        } },
                      ])
                    }}
                    flat
                  />
                )}
              </View>
            ) : null}

            {tab === "posiciones" ? (
              <View style={{ gap: Gap.md }}>
                <StandingsTable rows={standings} isLoading={standingsLoading} />
                {standings.length > 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={async () => {
                      try {
                        const rows = standings.map((r, i) => ({
                          pos: i + 1,
                          equipo: r.equipo?.nombre ?? "—",
                          pj: r.partidosJugados,
                          g: r.ganados,
                          e: r.empatados,
                          p: r.perdidos,
                          dg: r.diferenciaGoles,
                          pts: r.puntos,
                        }))
                        const html = standingsHtml(division.nombre, rows)
                        await downloadPdf(html, `Tabla-${division.nombre}.pdf`)
                      } catch {
                        toast.error("Error al generar PDF")
                      }
                    }}
                    style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm }}
                  >
                    <MaterialIcons name="picture-as-pdf" size={20} color={Palette.dark} />
                    <Text style={{ color: Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>Descargar PDF</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {tab === "eliminatorias" && tieneEliminatorias && rondas.length > 0 ? (
              <View style={{ gap: Gap.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
                  <MaterialIcons name="emoji-events" size={20} color={Palette.cyan} />
                  <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Eliminatorias</Text>
                </View>
                {[...rondas].sort((a, b) => a.orden - b.orden).map((ronda) => (
                  <TouchableOpacity
                    key={ronda.id}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/(drawer)/leagues/${ligaId}/divisions/${divisionId}/eliminatorias?rondaId=${ronda.id}`)}
                    style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontFamily: Fonts.bold, color: Palette.text }}>{ronda.nombre}</Text>
                      <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Alert.alert("Eliminar eliminatorias", "¿Seguro? Se borrarán todas las rondas y partidos de eliminatoria.", [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Eliminar",
                        style: "destructive",
                        onPress: () => {
                          deleteRondas.mutate(divisionId!, {
                            onSuccess: () => {
                              clearEliminatoriaSlots(divisionId!)
                              setTab("jornadas")
                            },
                          })
                        },
                      },
                    ])
                  }}
                  style={{ backgroundColor: Palette.danger, borderRadius: 12, paddingVertical: Pad.md, alignItems: "center" }}
                >
                  <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Eliminar eliminatorias</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {tab === "programacion" ? (
              <DivisionScheduleManager
                divisionId={divisionId!}
                embedded
                isGeneratingJornada={generateNext.isPending}
                onGenerateJornada={handleGenerateJornada}
              />
            ) : null}
          </View>
        </PullToRefresh>
      </View>

      <AppBottomSheetModal visible={modalRondas} onClose={() => setModalRondas(false)} title="¿Cuántos equipos pasan?" snapPoints={["45%"]}>
        <View style={{ alignItems: "center", gap: 20 }}>
          <View style={{ flexDirection: "row", gap: Gap.md }}>
            {opcionesEquipos.map((n) => (
              <TouchableOpacity
                key={n}
                activeOpacity={0.7}
                onPress={() => {
                  if (generatingLlaves.current) return
                  generatingLlaves.current = true
                  setModalRondas(false)
                  generateRondas.mutate({ divisionId: divisionId!, cantidadEquipos: n }, {
                    onSuccess: async () => {
                      try {
                        await qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] })
                        const rondasData = qc.getQueryData<{ id: string; nombre: string }[]>(["rondas-playoff", divisionId]) ?? []
                        const eliminados: { id: string; nombre: string; llave: number }[] = []
                        for (const r of rondasData) {
                          const partidos = await partidoApi.findByRondaPlayoff(r.id)
                          for (const p of partidos) {
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
                          const validDays = parseDiasPartido(division.diasPartido ?? "sab")
                          const ranges = (division.horarioPartido ?? "08:00-20:00").split("-").map((s) => s.trim()).filter((s) => s)
                          const slotTotal = (division.duracionPartido ?? 60) + (division.descanso ?? 0)
                          const duracion = division.duracionPartido ?? 60

                          const dayTimeSlots: { horaInicio: string; horaFin: string }[] = []
                          for (const range of ranges) {
                            const parseM = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0) }
                            let current = parseM(range.split("-")[0])
                            const finMin = parseM(range.includes("-") ? range.split("-")[1] : range)
                            while (current + duracion <= finMin) {
                              dayTimeSlots.push({
                                horaInicio: `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`,
                                horaFin: `${String(Math.floor((current + duracion) / 60)).padStart(2, "0")}:${String((current + duracion) % 60).padStart(2, "0")}`,
                              })
                              current += slotTotal
                            }
                          }

                          const ocupadosMap = new Map<string, Set<string>>()
                          for (const sl of existing.slots) {
                            if (!ocupadosMap.has(sl.fecha)) ocupadosMap.set(sl.fecha, new Set())
                            ocupadosMap.get(sl.fecha)!.add(sl.horaInicio)
                          }

                          const refDate = existing.slots[0]?.fecha ?? formatDateLocal(new Date())
                          const refParts = refDate.split("-").map(Number)
                          const cursor = new Date(refParts[0], refParts[1] - 1, refParts[2])
                          const newSlots: typeof existing.slots = []

                          for (let d = 0; d < 60 && newSlots.length < eliminados.length; d++) {
                            if (validDays.includes(cursor.getDay())) {
                              const fecha = formatDateLocal(cursor)
                              const ocupados = ocupadosMap.get(fecha) ?? new Set()
                              for (const ts of dayTimeSlots) {
                                if (newSlots.length >= eliminados.length) break
                                if (!ocupados.has(ts.horaInicio)) {
                                  ocupados.add(ts.horaInicio)
                                  const e = eliminados[newSlots.length]
                                  newSlots.push({
                                    id: `slot-${existing.slots.length + newSlots.length}-elim`,
                                    fecha,
                                    horaInicio: ts.horaInicio,
                                    horaFin: ts.horaFin,
                                    equipoLocalId: undefined,
                                    equipoVisitanteId: undefined,
                                    tipo: "eliminatoria" as const,
                                    partidoId: e.id,
                                    rondaNombre: e.nombre,
                                    llave: e.llave,
                                  })
                                }
                              }
                            }
                            cursor.setDate(cursor.getDate() + 1)
                          }

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
                }}
                disabled={generateRondas.isPending}
                style={{
                  width: 80, height: 80, borderRadius: 16,
                  backgroundColor: Palette.cyan,
                  alignItems: "center", justifyContent: "center",
                  opacity: generateRondas.isPending ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 28, fontFamily: Fonts.displayBold, color: Palette.black }}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => setModalRondas(false)} style={{ paddingVertical: Pad.sm }}>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
          {generateRondas.isPending ? (
            <ActivityIndicator size="small" color={Palette.cyan} />
          ) : null}
        </View>
      </AppBottomSheetModal>

      <QRScannerModal visible={scannerOpen} onBarcodeScanned={handleBarcodeScanned} onClose={handleScannerClose} scannerError={scannerError} onRetry={handleScannerRetry} />
      <ConfirmationModal
        visible={showResetConfirm}
        title="Reiniciar división"
        message="¿Seguro? Se borrarán todas las jornadas, partidos, eliminatorias y estadísticas. Los equipos se conservan."
        variant="danger"
        confirmLabel="Reiniciar"
        loading={resetDivision.isPending}
        onConfirm={() => {
          resetDivision.mutate(divisionId!, { onSuccess: () => resetSchedule(divisionId!) })
          setShowResetConfirm(false)
        }}
        onClose={() => setShowResetConfirm(false)}
      />
      <Modal visible={generateNext.isPending} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: Palette.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: Palette.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 32, paddingTop: 48, paddingBottom: 48, marginBottom: bottomInset, alignItems: "center", gap: 16, borderTopWidth: 1, borderColor: Palette.border }}>
            <ActivityIndicator size="large" color={Palette.cyan} />
            <Text style={{ color: Palette.cyan, fontSize: 18, fontWeight: "700" }}>Generando jornada...</Text>
          </View>
        </View>
      </Modal>
    </AuthGate>
  )
}
