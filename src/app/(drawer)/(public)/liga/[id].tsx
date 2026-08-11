import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Linking, Share } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import { useQueryClient } from "@tanstack/react-query"
import PullToRefresh from "@/shared/components/PullToRefresh"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import LogoImage from "@/shared/components/LogoImage"
import { TabBar } from "@/shared/components/TabBar"
import { useLocalSearchParams, useRouter, useIsFocused } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useDivisionEquipos } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useJornadasInfinitas } from "@/features/jornada/hooks/useJornadasInfinitas"
import { useTablaPosiciones } from "@/features/tabla-posicion/hooks/useTablaPosiciones"
import StandingsTable from "@/features/tabla-posicion/components/StandingsTable"
import CustomHeader from "@/shared/components/CustomHeader"
import { useRondasPlayoff } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import BracketView from "@/features/ronda-playoff/components/BracketView"
import type { JornadaResponse } from "@/features/jornada/api/jornadas"
import { useLigaFavoritaStore } from "@/stores/ligaFavoritaStore"
import { useDivisionNotificationStore } from "@/stores/divisionNotificationStore"
import { useToast } from "@/shared/components/Toast"
import { OneSignal } from "react-native-onesignal"
import { notificationSubscriptionApi } from "@/features/notification/api/notificationSubscription"
import { nonemptyId } from "@/infrastructure/notifications/notificationIdentity"
import { changeDivisionSubscription } from "@/features/notification/subscriptionFlow"
import { formatLocalTime, toLocalDateKey } from "@/shared/utils/date-time"
import { getPlayoffRoundMatchCounts } from "@/features/division/utils/playoff"
import { useGoleadores } from "@/features/goleador/hooks/useGoleadores"
import GoleadoresTable from "@/features/goleador/components/GoleadoresTable"
import { useNavGuard } from "@/shared/hooks/useNavGuard"

function fmtHora(f: string) {
  return formatLocalTime(f)
}

function toLocalDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })
}

function fmtFecha(f: string) {
  const [, m, d] = f.split("-").map(Number)
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${d} ${meses[m - 1]}`
}

function fmtFechaConDia(f: string): string {
  const [y, m, d] = f.split("-").map(Number)
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  return `${d} ${meses[m - 1]} - ${dias[new Date(y, m - 1, d).getDay()]}`
}

const DIA_ABREV: Record<string, string> = {
  Lunes: "L", Martes: "M", Miércoles: "M",
  Jueves: "J", Viernes: "V", Sábado: "S", Domingo: "D",
}

function abreviarDias(dias: string): string {
  const partes = dias.split(/[,\s]+y\s+|[,\s]+|\s+y\s+/).filter(Boolean)
  const iniciales = partes.map((p) => DIA_ABREV[p.trim()] ?? p.trim())
  if (iniciales.length <= 1) return iniciales.join("")
  if (iniciales.length === 2) return `${iniciales[0]} y ${iniciales[1]}`
  return `${iniciales.slice(0, -1).join(", ")} y ${iniciales[iniciales.length - 1]}`
}

function estadoColor(nombre?: string): string {
  switch (nombre?.toUpperCase()) {
    case "ABIERTA": return Palette.warning
    case "EN CURSO": return Palette.success
    case "FINALIZADO": return Palette.cyan
    default: return Palette.textMuted
  }
}

function whatsappUrl(phone: string, leagueName: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  const text = encodeURIComponent(`Hola, me interesa la liga ${leagueName}`)
  return `https://wa.me/${digits}?text=${text}`
}

export default function PublicLeagueScreen() {
  const { id, divisionId: initialDiv, tab: initialTab } = useLocalSearchParams<{
    id: string
    divisionId?: string
    tab?: "info" | "posiciones" | "horario" | "goleo"
  }>()
  const router = useRouter()
  const toggleFav = useLigaFavoritaStore((s) => s.toggle)
  const removeFav = useLigaFavoritaStore((s) => s.remove)
  const esFav = useLigaFavoritaStore((s) => s.esFavorito(id!))
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const toggleSub = useDivisionNotificationStore((s) => s.toggle)
  const subscriptions = useDivisionNotificationStore((s) => s.subscriptions)
  const { data: league, isLoading, error: leagueError, refetch: refetchLeague } = useLeague(id!)
  const toast = useToast()
  const guard = useNavGuard()

  useEffect(() => {
    if (!leagueError || !esFav) return
    const err = leagueError as any
    const is404 = err?.response?.status === 404 || err?.message?.toLowerCase().includes("no encontrad")
    if (is404) {
      removeFav(id!)
      toast.info("La liga ya no existe y se eliminó de favoritos")
    }
  }, [esFav, id, leagueError, removeFav, toast])

  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(initialDiv ?? null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [tab, setTab] = useState<"info" | "posiciones" | "horario" | "goleo">(
    initialTab === "posiciones" || initialTab === "horario" || initialTab === "goleo" || initialTab === "info"
      ? initialTab
      : "info"
  )

  const rangePickerRef = useRef<BottomSheetModal>(null)
  const rangeSnapPoints = useMemo(() => ["50%"], [])
  const insets = useSafeAreaInsets()

  const scrollViewRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const heroStarRef = useRef<any>(null)
  const divisionRef = useRef<any>(null)
  const followRef = useRef<any>(null)
  const tabBarRef = useRef<any>(null)
  const tourStartedRef = useRef(false)
  const [followReady, setFollowReady] = useState(false)
  const [tabBarReady, setTabBarReady] = useState(false)

  const isFocused = useIsFocused()
  const { startTour } = useTourGuide()

  const publicOwnerPhone = league?.user?.showPhoneInPublicLeague ? league.user.phoneNumber : null
  const ownerWhatsappUrl = publicOwnerPhone && league ? whatsappUrl(publicOwnerPhone, league.nombre) : null
  const ubicacionNombre = league?.ubicacion?.nombreCompleto ?? null

  const divisiones = league?.divisiones ?? []
  const currentDivision = selectedDivisionId
    ? divisiones.find((d) => d.id === selectedDivisionId) ?? divisiones[0] ?? null
    : divisiones[0] ?? null
  const divisionSubscribed = currentDivision
    ? subscriptions.some((x) => x.divisionId === currentDivision.id)
    : false

  const ranges = currentDivision?.horarioPartido
    ? currentDivision.horarioPartido.split(" / ").map((r) => {
        const p = r.split(" - ").map((s) => s.trim())
        if (p.length === 2) return { start: p[0], end: p[1] }
        const p2 = r.split("-").map((s) => s.trim())
        if (p2.length === 2) return { start: p2[0], end: p2[1] }
        return null
      }).filter(Boolean) as { start: string; end: string }[]
    : []

  const renderRangeBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  ), [])

  const handleShareLeague = useCallback(() => {
    const text = `${league?.nombre ?? "Liga"} - Tenka`
    Share.share({ message: `${text}\n\nhttps://tenka.studio/liga/${id}`, title: text })
  }, [league, id])

  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const currentDivisionId = currentDivision?.id

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["leagues", id] }),
      currentDivisionId ? qc.invalidateQueries({ queryKey: ["division-equipos", currentDivisionId] }) : Promise.resolve(),
      currentDivisionId ? qc.invalidateQueries({ queryKey: ["tabla-posiciones", currentDivisionId] }) : Promise.resolve(),
      currentDivisionId ? qc.invalidateQueries({ queryKey: ["jornadas-infinitas", currentDivisionId] }) : Promise.resolve(),
      currentDivisionId ? qc.invalidateQueries({ queryKey: ["rondas-playoff", currentDivisionId] }) : Promise.resolve(),
      currentDivisionId ? qc.invalidateQueries({ queryKey: ["goleadores", currentDivisionId] }) : Promise.resolve(),
    ])
    setRefreshing(false)
  }, [qc, id, currentDivisionId])

  const { data: links = [] } = useDivisionEquipos(currentDivision?.id ?? "")
  const teamCount = links.length

  const { data: standings = [], isLoading: standingsLoading } = useTablaPosiciones(currentDivision?.id ?? null)
  const goleadores = useGoleadores(currentDivision?.id)
  const { data, isLoading: jornadasLoading, fetchNextPage, error: jornadasError, refetch: refetchJornadas } = useJornadasInfinitas(currentDivision?.id ?? null)

  const { data: rondas = [] } = useRondasPlayoff(currentDivision?.id ?? null)

  const jornadas = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data])
  const totalJornadas = data?.pages[0]?.total ?? 0

  const [jornadaSelection, setJornadaSelection] = useState<{
    divisionId: string
    jornadaId: string
  } | null>(null)
  const [fetchingNext, setFetchingNext] = useState(false)

  const defaultJornada = jornadas.find((j) =>
    j.partidos?.some((p) => p.estado !== "FINALIZADO")
  ) ?? jornadas[0] ?? null
  const selectedJornadaId = jornadaSelection?.divisionId === currentDivisionId
    && jornadas.some((j) => j.id === jornadaSelection.jornadaId)
    ? jornadaSelection.jornadaId
    : defaultJornada?.id ?? null
  const selectJornada = (jornadaId: string) => {
    if (!currentDivisionId) return
    setJornadaSelection({ divisionId: currentDivisionId, jornadaId })
  }

  const selectedIdx = selectedJornadaId ? jornadas.findIndex((j) => j.id === selectedJornadaId) : -1
  const pageStart = selectedIdx >= 0 ? Math.floor(selectedIdx / 4) * 4 : 0
  const pageJornadas = jornadas.slice(pageStart, pageStart + 4)

  const selectedJornada = selectedJornadaId ? jornadas.find((j) => j.id === selectedJornadaId) ?? null : null

  const canPrev = selectedIdx > 0
  const canNext = (selectedIdx < jornadas.length - 1 || jornadas.length < totalJornadas) && !fetchingNext

  const handlePrevJornada = () => {
    if (selectedIdx <= 0) return
    selectJornada(jornadas[selectedIdx - 1].id)
  }

  const handleNextJornada = async () => {
    if (selectedIdx < 0 || fetchingNext) return
    const nextIdx = selectedIdx + 1
    if (nextIdx >= jornadas.length) {
      if (jornadas.length < totalJornadas) {
        setFetchingNext(true)
        try {
          const result = await fetchNextPage()
          const all = result.data?.pages.flatMap((p) => p.rows) ?? []
          if (all.length > nextIdx) {
            selectJornada(all[nextIdx].id)
          }
        } catch {
          // fetch failed silently
        } finally {
          setFetchingNext(false)
        }
      }
      return
    }
    selectJornada(jornadas[nextIdx].id)
  }

  const goToTeam = useCallback((teamId?: string | null) => {
    if (!teamId || !currentDivisionId) return
    guard(() => {
      router.push({
        pathname: "/(drawer)/(public)/equipo/[id]/division/[divisionId]",
        params: { id: teamId, divisionId: currentDivisionId },
      })
    })
  }, [currentDivisionId, router, guard])

  const rondaMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of rondas) map[r.id] = r.nombre
    return map
  }, [rondas])

  const bracketRounds = useMemo(() => {
    const sorted = [...rondas].sort((a, b) => a.orden - b.orden)
    const matchCounts = getPlayoffRoundMatchCounts(sorted.length)
    return sorted.map((r, ri) => {
      const expected = matchCounts[ri]
      const partidos = r.partidos
      const matches: import("@/features/ronda-playoff/components/BracketView").BracketMatchData[] = []
      for (let i = 0; i < expected; i++) {
        const llave = i + 1
        const actual = partidos.find((p) => p.llave === llave)
        if (actual) {
          matches.push({
            id: actual.id,
            localNombre: actual.equipoLocal?.nombre ?? null,
            visitanteNombre: actual.equipoVisitante?.nombre ?? null,
            golesLocal: actual.golesLocal,
            golesVisitante: actual.golesVisitante,
            penalesLocal: actual.penalesLocal,
            penalesVisitante: actual.penalesVisitante,
            estado: actual.estado,
            isPlaceholder: false,
          })
        } else {
          matches.push({
            id: `ph-${r.id}-${llave}`,
            localNombre: null,
            visitanteNombre: null,
            golesLocal: 0,
            golesVisitante: 0,
            estado: null,
            isPlaceholder: true,
          })
        }
      }
      return { nombre: r.nombre, matches }
    })
  }, [rondas])

  const renderJornada = useCallback(({ item }: { item: JornadaResponse }) => {
    const partidos = item.partidos ?? []
    const groups: Record<string, typeof partidos> = {}
    for (const p of partidos) {
      const key = p.fecha ? toLocalDateKey(p.fecha) : "sin-fecha"
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    const entries = Object.entries(groups).sort(([a], [b]) => a === "sin-fecha" ? 1 : b === "sin-fecha" ? -1 : a.localeCompare(b))
    const allDates = entries.map(([k]) => k).filter((k) => k !== "sin-fecha")
    const dateRange = allDates.length > 0
      ? `${fmtFecha(allDates[0])}${allDates.length > 1 ? ` - ${fmtFecha(allDates[allDates.length - 1])}` : ""}`
      : ""
    const st = (() => {
      if (!partidos.length) return { label: "Sin partidos", color: Palette.textMuted, icon: "info" as const }
      const es = new Set(partidos.map((p) => p.estado))
      if (es.has("SUSPENDIDO") && !es.has("FINALIZADO")) return { label: "Suspendida", color: Palette.danger, icon: "cancel" as const }
      const hasFinalized = es.has("FINALIZADO")
      const hasPending = partidos.some((p) => p.estado !== "FINALIZADO" && p.estado !== "SUSPENDIDO")
      if (hasFinalized && hasPending) return { label: "En curso", color: Palette.success, icon: "play-circle" as const }
      if (es.size === 1 && hasFinalized) return { label: "Finalizada", color: Palette.cyan, icon: "check-circle" as const }
      return { label: "Próxima", color: Palette.warning, icon: "schedule" as const }
    })()

    return (
      <View style={{ marginHorizontal: Pad.base, backgroundColor: Palette.surface, borderRadius: 6, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
        <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <MaterialIcons name="calendar-month" size={14} color={Palette.cyan} />
              <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.display }}>Jornada {item.numero}</Text>
            </View>
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>{partidos.length} partido{partidos.length !== 1 ? "s" : ""}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, marginTop: 2 }}>
            {dateRange ? <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.sans }}>{dateRange}</Text> : null}
            <MaterialIcons name={st.icon} size={12} color={st.color} />
            <Text style={{ color: st.color, fontSize: 10, fontFamily: Fonts.semiBold }}>{st.label}</Text>
          </View>
        </View>
      <View style={{ padding: Pad.base, gap: Gap.md }}>
          {entries.length > 0 ? (
            entries.map(([dateKey, partidos]) => (
              <View key={dateKey} style={{ gap: Gap.sm }}>
                  {dateKey !== "sin-fecha" ? (
                  <View style={{ backgroundColor: Palette.cyan20, borderRadius: Radius.sm, paddingVertical: 3, paddingHorizontal: Pad.sm, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.cyan }}>{fmtFechaConDia(dateKey)}</Text>
                  </View>
                ) : null}
                {partidos.map((p, idx) => {
                  const badgeTipo = p.tipoPartido === 'ELIMINATORIA'
                    ? { bg: Palette.playoff10, border: Palette.playoff, text: Palette.playoff, label: rondaMap[p.rondaPlayoffId ?? ""] ?? "Eliminatoria" }
                    : p.tipoPartido === 'AMISTOSO'
                    ? { bg: Palette.success10, border: Palette.success, text: Palette.success, label: "Amistoso" }
                    : p.tipoPartido === 'COMPLEMENTO'
                    ? { bg: Palette.warning10, border: Palette.warning, text: Palette.warning, label: "Completar" }
                    : p.tipoPartido === 'REGULAR'
                    ? { bg: Palette.cyan10, border: Palette.cyan, text: Palette.cyan, label: "Liga" }
                    : null
                  return (
                  <View key={p.id}>
                     <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, paddingVertical: Pad.sm }}>
                       <View style={{ width: 72, alignItems: "center", gap: Gap.sm }}>
                         {badgeTipo ? (
                           <View style={{ maxWidth: 72, backgroundColor: badgeTipo.bg, borderRadius: Radius.sm, borderWidth: 1, borderColor: badgeTipo.border, paddingHorizontal: 6, paddingVertical: 2 }}>
                             <Text numberOfLines={1} style={{ fontSize: 8, fontFamily: Fonts.semiBold, color: badgeTipo.text }}>{badgeTipo.label}</Text>
                           </View>
                         ) : null}
                         {p.fecha ? (
                           <Text style={{ color: Palette.cyan, fontSize: 13, fontFamily: Fonts.semiBold }}>{fmtHora(p.fecha)}</Text>
                         ) : null}
                         {p.cancha?.nombre ? (
                           <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 }}>
                             <MaterialIcons name="place" size={11} color={Palette.cyan} />
                             <Text numberOfLines={2} style={{ color: Palette.textMuted, fontSize: 9, fontFamily: Fonts.sans, textAlign: "center", flexShrink: 1 }}>{p.cancha.nombre}</Text>
                           </View>
                         ) : null}
                       </View>
                        <View style={{ flex: 1, gap: 6 }}>
                        <TouchableOpacity activeOpacity={p.equipoLocal?.id ? 0.75 : 1} onPress={() => goToTeam(p.equipoLocal?.id)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                          <LogoImage uri={p.equipoLocal?.logo} size={22} backgroundColor={Palette.dark40} radius={Radius.sm} />
                          <Text style={{ fontSize: 13, color: Palette.text, fontFamily: Fonts.medium, flexShrink: 1 }} numberOfLines={1}>{p.equipoLocal?.nombre ?? ""}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={p.equipoVisitante?.id ? 0.75 : 1} onPress={() => goToTeam(p.equipoVisitante?.id)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                          <LogoImage uri={p.equipoVisitante?.logo} size={22} backgroundColor={Palette.dark40} radius={Radius.sm} />
                          <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.medium, flexShrink: 1 }} numberOfLines={1}>{p.equipoVisitante?.nombre ?? ""}</Text>
                        </TouchableOpacity>
                      </View>
                       <View style={{ width: 50, alignItems: "center", justifyContent: "center" }}>
                           {p.estado === "FINALIZADO" ? (
                            <View style={{ alignItems: "center" }}>
                              <Text style={{ fontSize: 16, fontFamily: Fonts.displayBold, color: Palette.cyan }}>{p.golesLocal}</Text>
                              <View style={{ width: 20, height: 1, backgroundColor: Palette.border, marginVertical: 1 }} />
                              <Text style={{ fontSize: 16, fontFamily: Fonts.displayBold, color: Palette.textSecondary }}>{p.golesVisitante}</Text>
                            </View>
                          ) : p.estado === "EN_JUEGO" ? (
                            <View style={{ backgroundColor: Palette.success, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 9, fontFamily: Fonts.semiBold, color: Palette.black }}>EN VIVO</Text>
                            </View>
                          ) : p.estado === "SUSPENDIDO" ? (
                            <View style={{ backgroundColor: Palette.danger, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 9, fontFamily: Fonts.semiBold, color: Palette.white }}>SUSP</Text>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.textMuted }}>VS</Text>
                          )}
                       </View>
                    </View>
                    {idx < partidos.length - 1 ? (
                      <View style={{ height: 1, backgroundColor: Palette.border, marginVertical: Gap.sm }} />
                    ) : null}
                  </View>
                  )
                })}
              </View>
            ))
          ) : (
            <Text style={{ color: Palette.textSecondary, fontSize: 12 }}>Sin partidos</Text>
          )}
        </View>
      </View>
    )
  }, [goToTeam, rondaMap])

  const direccionContent = ubicacionNombre ? (
    <View style={{ gap: Gap.md }}>
      <Text style={{ fontSize: 11, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Dirección</Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(ubicacionNombre)}`)}
        style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="location-on" size={16} color={Palette.cyan} />
        </View>
        <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans, flex: 1 }}>{ubicacionNombre}</Text>
        <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
      </TouchableOpacity>
    </View>
  ) : null

  const divisionInfoContent = currentDivision ? (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
      <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.sans }}>{currentDivision.categoria.nombre} · {currentDivision.tipo.nombre}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <View style={{ width: "50%", paddingVertical: Pad.sm, paddingRight: Pad.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="people" size={14} color={Palette.cyan} />
            </View>
            <View>
              <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Equipos</Text>
              <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{teamCount} / {currentDivision.maxEquipos}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: "50%", paddingVertical: Pad.sm, paddingLeft: Pad.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="attach-money" size={14} color={Palette.cyan} />
            </View>
            <View>
              <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Arbitraje</Text>
              <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>${currentDivision.arbitraje}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: "50%", paddingVertical: Pad.sm, paddingRight: Pad.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="calendar-today" size={14} color={Palette.cyan} />
            </View>
            <View>
              <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Días</Text>
              <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{currentDivision.diasPartido ? abreviarDias(currentDivision.diasPartido) : "-"}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: "50%", paddingVertical: Pad.sm, paddingLeft: Pad.sm }}>
          {ranges.length > 1 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => rangePickerRef.current?.present()}
              style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="access-time" size={14} color={Palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Horario</Text>
                <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }} numberOfLines={1}>{currentDivision.horarioPartido ?? "-"}</Text>
              </View>
              <MaterialIcons name="info-outline" size={18} color={Palette.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="access-time" size={14} color={Palette.cyan} />
              </View>
              <View>
                <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Horario</Text>
                <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{currentDivision.horarioPartido ?? "-"}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {(currentDivision.duracionPartido || currentDivision.fechaInicio) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.md, paddingTop: Pad.sm, borderTopWidth: 1, borderTopColor: Palette.border }}>
          {currentDivision.duracionPartido ? (
            <Text style={{ fontSize: 12, color: Palette.textSecondary, fontFamily: Fonts.sans }}>⏱ {currentDivision.duracionPartido} min · {currentDivision.descanso ?? 0} min desc</Text>
          ) : null}
          {currentDivision.fechaInicio ? (
            <Text style={{ fontSize: 12, color: Palette.textSecondary, fontFamily: Fonts.sans }}>
              📆 {toLocalDateDisplay(currentDivision.fechaInicio)}
              {currentDivision.fechaFin ? ` - ${toLocalDateDisplay(currentDivision.fechaFin)}` : ""}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  ) : null

  const headerContent = (
    <View>
      <View style={{ position: "relative" }}>
        <Image source={league?.cancha ? { uri: league.cancha } : require("@/assets/ejemplos/campo.jpg")} style={{ width: "100%", height: 180 }} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.20)", "rgba(0,0,0,0.90)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: Pad.base, justifyContent: "flex-end" }}>
          {currentDivision ? (
            <View style={{ position: "absolute", top: 12, left: 0 }}>
              <View style={{ backgroundColor: estadoColor(currentDivision.estadoLiga.nombre), paddingHorizontal: 14, paddingVertical: 5, borderTopRightRadius: 6, borderBottomRightRadius: 6, elevation: 4, shadowColor: "#000", shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2 }}>
                <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.black }}>{currentDivision.estadoLiga.nombre}</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderLeftColor: "transparent", borderTopWidth: 6, borderTopColor: "rgba(0,0,0,0.2)" }} />
            </View>
          ) : null}
          <TouchableOpacity
            ref={heroStarRef}
            onPress={() => toggleFav({ id: id!, nombre: league?.nombre ?? "", cancha: league?.cancha ?? null, logo: league?.logo ?? null })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: "absolute", top: 12, right: 12, zIndex: 20, elevation: 20, width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.dark, borderWidth: 1.5, borderColor: esFav ? Palette.warning : Palette.textMuted, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialIcons name={esFav ? "star" : "star-outline"} size={20} color={esFav ? Palette.warning : Palette.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.base }}>
            <LogoImage uri={league?.logo} size={48} ring={Palette.cyan} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 18, fontFamily: Fonts.display }}>{league?.nombre}</Text>
              <View style={{ width: 80, height: 1, backgroundColor: Palette.cyan, borderRadius: 1, marginVertical: Gap.sm }} />
              {league?.descripcion ? <Text style={{ color: Palette.textSecondary, fontSize: 12 }} numberOfLines={2}>{league.descripcion}</Text> : null}
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: Pad.base, paddingBottom: Pad.base, gap: Gap.md }}>
        <Text style={{ fontSize: 11, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Divisiones</Text>
        <View style={{ position: "relative", zIndex: 10 }}>
          <TouchableOpacity
            ref={divisionRef}
            activeOpacity={0.7}
            onPress={() => setPickerOpen((prev) => !prev)}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.borderActive, paddingHorizontal: Pad.base, paddingVertical: Pad.md }}
          >
            <Text numberOfLines={1} style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.medium, flex: 1 }}>{currentDivision ? `${currentDivision.nombre} · ${currentDivision.categoria.nombre}` : "Seleccionar"}</Text>
            <MaterialIcons name={pickerOpen ? "expand-less" : "expand-more"} size={22} color={Palette.cyan} />
          </TouchableOpacity>

          {pickerOpen ? (
            <View style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: Gap.sm, backgroundColor: Palette.dark, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
              {divisiones.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  activeOpacity={0.7}
                  onPress={() => { setSelectedDivisionId(d.id); setPickerOpen(false) }}
                  style={{ paddingHorizontal: Pad.base, paddingVertical: Pad.lg, backgroundColor: currentDivision?.id === d.id ? Palette.cyan10 : "transparent" }}
                >
                  <Text numberOfLines={1} style={{ color: currentDivision?.id === d.id ? Palette.cyan : Palette.text, fontSize: 14, fontFamily: currentDivision?.id === d.id ? Fonts.semiBold : Fonts.medium }}>{d.nombre} · {d.categoria.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {currentDivision ? (
          <>
          <TouchableOpacity
            ref={followRef}
            onLayout={() => setFollowReady(true)}
            activeOpacity={0.7}
            disabled={subscribing === currentDivision.id}
            onPress={async () => {
              if (subscribing) return
              const divId = currentDivision.id
              setSubscribing(divId)
              try {
                const [rawOneSignalId, rawPushSubscriptionId] = await Promise.all([
                  OneSignal.User.getOnesignalId(),
                  OneSignal.User.pushSubscription.getIdAsync(),
                ])
                const oneSignalId = nonemptyId(rawOneSignalId)
                const pushSubscriptionId = nonemptyId(rawPushSubscriptionId)
                if (!oneSignalId || !pushSubscriptionId) throw new Error("Las notificaciones aún no están disponibles en este dispositivo")
                await changeDivisionSubscription({
                  subscribed: divisionSubscribed,
                  divisionId: divId,
                  oneSignalId,
                  pushSubscriptionId,
                  subscribe: (data) => notificationSubscriptionApi.subscribe(data),
                  unsubscribe: (data) => notificationSubscriptionApi.unsubscribe(data),
                  commitLocalState: () => toggleSub({
                    divisionId: divId,
                    ligaId: id!,
                    ligaNombre: league?.nombre ?? "",
                    divisionNombre: currentDivision.nombre,
                  }),
                })
              } catch (e: any) {
                toast.error(e?.message ?? 'Error al cambiar suscripción')
              } finally {
                setSubscribing(null)
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: Gap.sm,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: divisionSubscribed ? Palette.cyan : Palette.border,
              backgroundColor: divisionSubscribed ? Palette.cyan : Palette.surface,
              paddingVertical: Pad.sm,
              paddingHorizontal: Pad.base,
              opacity: subscribing === currentDivision.id ? 0.5 : 1,
            }}
          >
            <MaterialIcons
              name={divisionSubscribed ? "notifications-active" : "notifications-none"}
              size={18}
              color={divisionSubscribed ? Palette.black : Palette.textSecondary}
            />
            <View style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: Fonts.semiBold,
                  color: divisionSubscribed ? Palette.black : Palette.textSecondary,
                }}
              >
                {divisionSubscribed ? "Siguiendo esta división" : "Seguir esta división"}
              </Text>
              {!divisionSubscribed ? (
                <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, marginTop: 2 }}>
                  Recibir notificaciones de jornadas
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
          </>
        ) : null}

        <View ref={tabBarRef} collapsable={false} onLayout={() => setTabBarReady(true)}>
          <TabBar
            tabs={[
              { key: "info", label: "Info" },
              { key: "posiciones", label: "Posiciones" },
              { key: "horario", label: "Horario" },
              { key: "goleo", label: "Goleo" },
            ]}
            activeTab={tab}
            onTabChange={(k) => setTab(k as "info" | "posiciones" | "horario" | "goleo")}
            stretch
          />
        </View>
      </View>
    </View>
  )

  const contactContent = (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="support-agent" size={18} color={Palette.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.display }}>Contacto</Text>
          <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans }}>
            {league?.user?.name ? `Organizador: ${league.user.name}` : "Contacta al organizador de la liga"}
          </Text>
        </View>
      </View>

      {ownerWhatsappUrl ? (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => Linking.openURL(ownerWhatsappUrl)}
          style={{ backgroundColor: Palette.success, borderRadius: Radius.md, paddingVertical: Pad.md, paddingHorizontal: Pad.base, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm }}
        >
          <MaterialIcons name="chat" size={18} color={Palette.black} />
          <Text style={{ color: Palette.black, fontSize: 15, fontFamily: Fonts.semiBold }}>Enviar WhatsApp</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, lineHeight: 18 }}>
          El organizador no publicó un número de contacto para esta liga.
        </Text>
      )}
    </View>
  )

  useEffect(() => {
    if (tourStartedRef.current) return
    if (!isFocused || !league || !currentDivision || !followReady || !tabBarReady) return
    if (!heroStarRef.current || !divisionRef.current || !followRef.current || !tabBarRef.current) return

    const initTour = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:public-league-v1")
      if (seen === "completed") {
        tourStartedRef.current = true
        return
      }

      startTour(
        [
          {
            id: "league-fav",
            targetRef: heroStarRef,
            title: "Guarda tus ligas favoritas",
            description: "Guarda esta liga para acceder rápidamente desde el inicio.",
            spotlightPadding: 8,
            tooltipPosition: "bottom",
          },
          {
            id: "league-division",
            targetRef: divisionRef,
            title: "Cambia de división",
            description: "Selecciona una división para consultar su información y resultados.",
            spotlightPadding: 8,
            tooltipPosition: "bottom",
          },
          {
            id: "league-follow",
            targetRef: followRef,
            title: "Recibe actualizaciones",
            description: "Activa las notificaciones para enterarte cuando se publiquen nuevas jornadas.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          },
          {
            id: "league-tabs",
            targetRef: tabBarRef,
            title: "Consulta la competencia",
            description: "Alterna entre la tabla de posiciones y los partidos programados.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          },
        ],
        {
          tourId: "public-league-v1",
          insets: { top: insets.top, bottom: insets.bottom },
          nextButtonText: "Siguiente",
          prevButtonText: "Atrás",
          skipButtonText: "Saltar",
          doneButtonText: "Entendido",
          onTourEnd: () => { AsyncStorage.setItem("@tour_guide:public-league-v1", "completed") },
          tooltipStyles: {
            backgroundColor: Palette.surface,
            titleColor: Palette.text,
            descriptionColor: Palette.textSecondary,
            buttonTextColor: Palette.black,
            primaryButtonColor: Palette.cyan,
            skipButtonColor: Palette.textMuted,
            borderRadius: Radius.lg,
          },
          spotlightStyles: {
            overlayColor: Palette.black,
            overlayOpacity: 0.7,
          },
          scrollRef: scrollViewRef,
          getCurrentScrollOffset: () => scrollOffsetRef.current,
        }
      )
      tourStartedRef.current = true
    }

    initTour()
  }, [isFocused, league, currentDivision, followReady, tabBarReady, startTour, insets.top, insets.bottom])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="" />
        <LoadingScreen />
      </View>
    )
  }

  if (leagueError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" />
        <ErrorState message={(leagueError as Error).message} onRetry={() => refetchLeague()} fullScreen />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Palette.text, fontSize: 16 }}>Liga no encontrada</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Información" rightActions={[{ icon: "share", onPress: handleShareLeague }]} />
      <PullToRefresh scrollRef={scrollViewRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }} onRefresh={handleRefresh} refreshing={refreshing}>
        <View style={{ paddingBottom: 48 }}>
          {headerContent}
          {tab === "info" ? (
            <View style={{ paddingHorizontal: Pad.base, gap: Gap.md }}>
              {direccionContent}
              {divisionInfoContent}
              {league.reglas?.length ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setRulesOpen((open) => !open)}
                  style={{ backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: rulesOpen ? Palette.borderActive : Palette.border, overflow: "hidden" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", padding: Pad.base, gap: Gap.md }}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name="rule" size={14} color={Palette.cyan} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, color: Palette.text, fontFamily: Fonts.medium }}>Reglas y directivas</Text>
                    <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 12, color: Palette.cyan, fontFamily: Fonts.semiBold }}>{league.reglas.length}</Text>
                    </View>
                    <MaterialIcons name={rulesOpen ? "expand-less" : "expand-more"} size={22} color={Palette.cyan} />
                  </View>
                  {rulesOpen ? (
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
                  ) : null}
                </TouchableOpacity>
              ) : null}
              {contactContent}
            </View>
          ) : null}
          {tab === "posiciones" ? (
            <View style={{ gap: Gap.md }}>
              <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
                <StandingsTable rows={standings} isLoading={standingsLoading} onTeamPress={goToTeam} />
              </View>
              {bracketRounds.length > 0 ? <BracketView rounds={bracketRounds} /> : null}
            </View>
          ) : null}
          {tab === "horario" ? (
            <View style={{ gap: Gap.md }}>
              {jornadasError ? (
                <ErrorState message={(jornadasError as Error).message} onRetry={() => refetchJornadas()} />
              ) : jornadas.length === 0 && !jornadasLoading ? (
                <EmptyState message="Sin jornadas registradas" icon="calendar-month" />
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Gap.sm, marginHorizontal: Pad.base }}>
                    <TouchableOpacity onPress={handlePrevJornada} disabled={!canPrev} activeOpacity={0.7} style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center", opacity: canPrev ? 1 : 0.3 }}>
                      <MaterialIcons name="chevron-left" size={20} color={Palette.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, flexDirection: "row", gap: Gap.sm, justifyContent: "center" }}>
                      {pageJornadas.map((j) => {
                        const isSelected = j.id === selectedJornadaId
                        return (
                          <TouchableOpacity
                            key={j.id}
                            onPress={() => selectJornada(j.id)}
                            activeOpacity={0.7}
                            style={{
                              paddingHorizontal: Pad.md,
                              paddingVertical: Pad.sm,
                              borderRadius: Radius.md,
                              backgroundColor: isSelected ? Palette.cyan20 : Palette.surfaceLight,
                              borderWidth: 1,
                              borderColor: isSelected ? Palette.cyan : Palette.border,
                            }}
                          >
                            <Text style={{ color: isSelected ? Palette.cyan : Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>J{j.numero}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                    <TouchableOpacity onPress={handleNextJornada} disabled={!canNext} activeOpacity={0.7} style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center", opacity: canNext ? 1 : 0.3 }}>
                      {fetchingNext ? (
                        <ActivityIndicator size="small" color={Palette.cyan} />
                      ) : (
                        <MaterialIcons name="chevron-right" size={20} color={Palette.text} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>
                      {pageStart + 1}-{Math.min(pageStart + 4, totalJornadas)} de {totalJornadas} jornadas
                    </Text>
                  </View>
                  {selectedJornada ? (
                    renderJornada({ item: selectedJornada })
                  ) : null}
                </>
              )}
            </View>
          ) : null}
          {tab === "goleo" ? <View style={{ marginHorizontal: Pad.base }}><GoleadoresTable data={goleadores.data} isLoading={goleadores.isLoading} error={goleadores.error} /></View> : null}
        </View>
      </PullToRefresh>
      <BottomSheetModal
        ref={rangePickerRef}
        snapPoints={rangeSnapPoints}
        enablePanDownToClose
        backdropComponent={renderRangeBackdrop}
        handleIndicatorStyle={{ backgroundColor: Palette.borderActive, width: 40, height: 4 }}
        backgroundStyle={{ backgroundColor: Palette.dark, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border }}
      >
        <BottomSheetView style={{ padding: Pad.xl, paddingBottom: insets.bottom + Pad.xl, gap: Gap.sm }}>
          <Text style={{ color: Palette.text, fontSize: 18, fontFamily: Fonts.display }}>Horarios disponibles</Text>
          {ranges.map((r, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, paddingVertical: Pad.md, paddingHorizontal: Pad.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="access-time" size={14} color={Palette.cyan} />
              </View>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>{r.start} - {r.end}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => rangePickerRef.current?.dismiss()} style={{ marginTop: Gap.sm, paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center" }}>
            <Text style={{ color: Palette.black, fontSize: 15, fontFamily: Fonts.semiBold }}>Cerrar</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

    </View>
  )
}
