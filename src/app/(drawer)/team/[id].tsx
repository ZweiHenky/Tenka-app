import { useEffect, useMemo, useState, useRef } from "react"
import { View, Text, TouchableOpacity, Image, Modal, TextInput, ActivityIndicator, Keyboard, Platform } from "react-native"
import { Flag, CountryModalProvider, CountryFilter, CountryList, getAllCountries, FlagType } from "react-native-country-picker-modal"
import type { Country, CountryCode } from "react-native-country-picker-modal"
import { router, useLocalSearchParams, useIsFocused } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import { useTeam } from "@/features/team/hooks/useTeams"
import { useAssignJugadorToTeam, useBuscarJugadorParaEquipo, useRemoveJugadorFromTeam, useJugadores } from "@/features/jugador/hooks/useJugadores"
import { POSICIONES_JUGADOR, type BuscarJugadorEquipoResult } from "@/domain/interfaces/player"
import { normalizeJugadorPhone } from "@/features/jugador/utils/phone"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import { authClient } from "@/infrastructure/auth/client"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import PullToRefresh from "@/shared/components/PullToRefresh"
import EmptyState from "@/shared/components/EmptyState"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { TabBar } from "@/shared/components/TabBar"
import { useToast } from "@/shared/components/Toast"
import TeamDetailHeaderCard from "@/features/team/components/TeamDetailHeaderCard"
import { useNavGuard } from "@/shared/hooks/useNavGuard"

const PAISES_COMUNES: CountryCode[] = [
  "MX", "US", "CA", "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC",
  "GT", "HN", "NI", "PA", "PE", "PY", "SV", "UY", "VE", "ES",
]

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((p) => p.id === posicion)?.nombre ?? posicion
}

export default function TeamDetailScreen() {
  const toast = useToast()
  const guard = useNavGuard()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: team, isLoading, error, refetch } = useTeam(id)
  const { data: jugadores = [], isLoading: loadingPlayers, refetch: refetchPlayers } = useJugadores(id)
  const { data: divisionLinks = [], isLoading: loadingDivisionLinks, refetch: refetchDivisionLinks } = useQuery({
    queryKey: ["division-equipos", "equipo", id],
    queryFn: () => divisionEquipoApi.findByEquipo(id!),
    enabled: !!id,
  })
  const buscarJugador = useBuscarJugadorParaEquipo()
  const assignJugador = useAssignJugadorToTeam()
  const removeJugadorFromTeam = useRemoveJugadorFromTeam()
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; jugadorId: string; nombre: string } | null>(null)
  const [tab, setTab] = useState<"jugadores" | "divisiones">("jugadores")
  const [searchOpen, setSearchOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [dorsal, setDorsal] = useState("")
  const [foundPlayer, setFoundPlayer] = useState<BuscarJugadorEquipoResult | null>(null)
  const [flowError, setFlowError] = useState("")
  const [countryCode, setCountryCode] = useState<CountryCode>("MX")
  const [callingCode, setCallingCode] = useState("52")
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [countryFilter, setCountryFilter] = useState("")
  const [allCountries, setAllCountries] = useState<Country[]>([])
  const [keyboardH, setKeyboardH] = useState(0)

  const newPlayerBtnRef = useRef<any>(null)
  const firstPlayerRef = useRef<any>(null)
  const tabBarRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const tourStartedRef = useRef(false)
  const [firstPlayerReady, setFirstPlayerReady] = useState(false)

  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { data: session } = authClient.useSession()
  const { startTour, endTour } = useTourGuide()

  const blocked = searchOpen || countryPickerOpen || !!deleteTarget || refreshing

  useEffect(() => {
    if (blocked) endTour()
  }, [blocked, endTour])

  useEffect(() => {
    if (!isFocused || isLoading || error || !team || !session?.user || tab !== "jugadores" || blocked) return
    if (tourStartedRef.current) return
    const init = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:team-detail-v1")
      if (seen === "completed") { tourStartedRef.current = true; return }
      if (!newPlayerBtnRef.current || !tabBarRef.current) return
      if (jugadores.length > 0 && (!firstPlayerRef.current || !firstPlayerReady)) return
      tourStartedRef.current = true
      const steps: any[] = [
        {
          id: "team-detail-add-player",
          targetRef: newPlayerBtnRef,
          title: "Busca jugadores",
          description: "Busca un perfil por teléfono y agrégalo con su dorsal a la plantilla del equipo.",
          spotlightPadding: 8,
          tooltipPosition: "bottom",
        },
      ]
      if (jugadores.length > 0) {
        steps.push({
          id: "team-detail-player",
          targetRef: firstPlayerRef,
          title: "Administra tu plantilla",
          description: "Toca un jugador para consultar su perfil. Usa el icono de eliminar para retirarlo de este equipo.",
          spotlightPadding: 8,
          tooltipPosition: "top",
        })
      }
      steps.push({
        id: "team-detail-divisions",
        targetRef: tabBarRef,
        title: "Configura cada división",
        description: "Abre Divisiones para elegir qué jugadores participan en cada competencia.",
        spotlightPadding: 8,
        tooltipPosition: "bottom",
      })
      startTour(steps, {
        tourId: "team-detail-v1",
        insets: { top: insets.top, bottom: insets.bottom },
        nextButtonText: "Siguiente",
        prevButtonText: "Atrás",
        skipButtonText: "Saltar",
        doneButtonText: "Entendido",
        onTourEnd: () => { AsyncStorage.setItem("@tour_guide:team-detail-v1", "completed") },
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
    }
    init()
  }, [isFocused, isLoading, error, team, session?.user, tab, blocked, jugadores.length, firstPlayerReady, startTour, endTour, insets.top, insets.bottom])

  useEffect(() => { getAllCountries(FlagType.EMOJI, "common", undefined, undefined, PAISES_COMUNES).then(setAllCountries) }, [])

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setKeyboardH(e.endCoordinates.height))
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardH(0))
    return () => { show.remove(); hide.remove() }
  }, [])

  const filteredCountries = useMemo(() => {
    if (!countryFilter) return allCountries
    const lower = countryFilter.toLowerCase()
    return allCountries.filter((c) => {
      const name = typeof c.name === "string" ? c.name : (c.name as any).common ?? ""
      return name.toLowerCase().includes(lower) || c.callingCode.some((cc) => cc.includes(countryFilter)) || c.cca2.toLowerCase().includes(lower)
    })
  }, [allCountries, countryFilter])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetch(), refetchPlayers(), refetchDivisionLinks()])
    } finally {
      setRefreshing(false)
    }
  }

  const resetSearchFlow = () => {
    setPhoneNumber("")
    setDorsal("")
    setFoundPlayer(null)
    setFlowError("")
    setCountryCode("MX")
    setCallingCode("52")
  }

  const closeSearch = () => {
    setSearchOpen(false)
    resetSearchFlow()
  }

  const handleSearch = async () => {
    if (!id) return
    Keyboard.dismiss()
    const telefono = normalizeJugadorPhone(callingCode, phoneNumber)
    if (!telefono) {
      setFoundPlayer(null)
      setFlowError("Ingresa un teléfono válido")
      return
    }
    setFoundPlayer(null)
    setDorsal("")
    setFlowError("")
    try {
      const result = await buscarJugador.mutateAsync({ equipoId: id, telefono })
      if (!result) {
        setFlowError("No encontramos un perfil de jugador con este teléfono")
        return
      }
      setFoundPlayer(result)
    } catch (error: any) {
      setFlowError(error?.response?.status === 404
        ? "No encontramos un perfil de jugador con este teléfono"
        : error?.message || "No se pudo buscar al jugador")
    }
  }

  const handleAssign = async () => {
    if (!id || !foundPlayer || foundPlayer.yaPertenece) return
    const dorsalNumber = Number(dorsal)
    if (!dorsal.trim() || !Number.isInteger(dorsalNumber)) {
      setFlowError("Ingresa un dorsal válido")
      return
    }
    Keyboard.dismiss()
    setFlowError("")
    try {
      await assignJugador.mutateAsync({ equipoId: id, jugadorId: foundPlayer.id, dorsal: dorsalNumber })
      closeSearch()
      toast.success("Jugador agregado al equipo")
    } catch (error: any) {
      setFlowError(error?.message || "No se pudo agregar al jugador")
    }
  }

  const confirmDelete = (jugadorId: string, nombre: string) => {
    setDeleteTarget({ id: jugadorId, jugadorId, nombre })
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    removeJugadorFromTeam.mutate({ jugadorId: deleteTarget.id, equipoId: id! }, {
      onSuccess: () => { toast.success("Jugador eliminado del equipo"); setDeleteTarget(null) },
      onError: () => { toast.error("Error al eliminar jugador"); setDeleteTarget(null) },
    })
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error || !team) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Equipo" />
        <ErrorState message={error ? (error as Error).message : "Equipo no encontrado"} onRetry={() => refetch()} fullScreen />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={team.nombre} />
      <PullToRefresh scrollRef={scrollRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }} refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <TeamDetailHeaderCard nombre={team.nombre} logo={team.logo} codigo={team.codigo} />
          <View ref={tabBarRef}>
             <TabBar
               tabs={[{ key: "jugadores", label: "Jugadores" }, { key: "divisiones", label: "Divisiones" }]}
               activeTab={tab}
               onTabChange={(nextTab) => setTab(nextTab as "jugadores" | "divisiones")}
             />
           </View>

          {tab === "jugadores" ? (
          <View style={{ gap: Gap.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Jugadores</Text>
               <TouchableOpacity ref={newPlayerBtnRef} accessibilityRole="button" accessibilityLabel="Buscar jugador" onPress={() => setSearchOpen(true)} style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.sm, paddingHorizontal: Pad.md }}>
                 <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 12 }}>Buscar jugador</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Todos los jugadores del equipo</Text>
            {loadingPlayers ? (
              <ActivityIndicator color={Palette.cyan} />
            ) : jugadores.length === 0 ? (
              <EmptyState message="Este equipo todavía no tiene jugadores" icon="groups" />
            ) : (
              jugadores.map((j, i) => {
                 const dorsal = j.equipos?.find((equipo) => equipo.equipoId === id)?.dorsal
                const card = (
                  <TouchableOpacity key={j.id} activeOpacity={0.8} onPress={() => guard(() => router.push(`/(drawer)/player/${j.id}`))} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm }}>
                    <View style={{ width: 48, height: 48, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight }}>
                      <Image source={j.foto ? { uri: j.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 48, height: 48 }} resizeMode="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{j.nombre}</Text>
                      <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(j.posicion)} · #{dorsal ?? "-"}</Text>
                    </View>
                    <TouchableOpacity onPress={() => confirmDelete(j.id, j.nombre)} style={{ padding: Pad.sm }}>
                      <MaterialIcons name="delete-outline" size={20} color={Palette.danger} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )
                if (i === 0) {
                  return <View key={j.id} ref={firstPlayerRef} onLayout={() => setFirstPlayerReady(true)}>{card}</View>
                }
                return card
              })
            )}
          </View>
          ) : null}

          {tab === "divisiones" ? (
            <View style={{ gap: Gap.sm }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Divisiones del equipo</Text>
              <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Aquí habilitas jugadores para cada división</Text>
              {loadingDivisionLinks ? (
                <ActivityIndicator color={Palette.cyan} />
              ) : divisionLinks.length === 0 ? (
                <EmptyState message="Este equipo no está asignado a divisiones" icon="emoji-events" />
              ) : (
                divisionLinks.map((link) => {
                  const division = link.division
                  return (
                    <TouchableOpacity key={link.divisionId} activeOpacity={0.8} onPress={() => guard(() => router.push(`/(drawer)/team/${id}/divisions/${link.divisionId}`))} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}>
                      <LogoImage uri={division?.liga?.logo} size={46} backgroundColor={Palette.surfaceLight} ring={Palette.cyan20} ringWidth={1} radius={Radius.lg} />
                      <View style={{ flex: 1 }}>
                         <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{division?.nombre ?? link.divisionId}</Text>
                         <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{division ? `${division.liga?.nombre ?? "Liga"} · ${division.categoria?.nombre ?? "Sin categoría"}` : "Liga"}</Text>
                      </View>
                      {division?.estadoLiga?.nombre ? (
                        <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
                          <Text style={{ color: Palette.cyan, fontSize: 11, fontFamily: Fonts.semiBold }}>{division.estadoLiga.nombre}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  )
                })
              )}
            </View>
          ) : null}
        </View>
      </PullToRefresh>

       <AppBottomSheetModal visible={searchOpen} onClose={closeSearch} title="Buscar jugador" snapPoints={["75%"]}>
         <View style={{ gap: Gap.sm }}>
           <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 13 }}>Teléfono</Text>
           <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
             <TouchableOpacity
               accessibilityRole="button"
               accessibilityLabel={`Seleccionar país, código actual más ${callingCode}`}
               accessibilityState={{ disabled: buscarJugador.isPending }}
               disabled={buscarJugador.isPending}
               onPress={() => setCountryPickerOpen(true)}
               style={{ minHeight: 48, flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, gap: Gap.sm }}
             >
               <Flag countryCode={countryCode} flagSize={24} />
               <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>+{callingCode}</Text>
             </TouchableOpacity>
             <TextInput
               accessibilityLabel="Número de teléfono del jugador"
               editable={!buscarJugador.isPending}
               value={phoneNumber}
               onChangeText={(value) => {
                 setPhoneNumber(value)
                 setFoundPlayer(null)
                 setDorsal("")
                 setFlowError("")
               }}
               onSubmitEditing={handleSearch}
               returnKeyType="search"
               placeholder="555 123 4567"
               placeholderTextColor={Palette.textMuted}
               keyboardType="phone-pad"
               maxLength={20}
               style={{ minHeight: 48, flex: 1, backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: Pad.base, color: Palette.text }}
             />
           </View>
           <TouchableOpacity
             accessibilityRole="button"
             accessibilityLabel="Buscar jugador por teléfono"
             accessibilityState={{ disabled: buscarJugador.isPending }}
             disabled={buscarJugador.isPending}
             onPress={handleSearch}
             style={{ minHeight: 48, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center", justifyContent: "center", opacity: buscarJugador.isPending ? 0.6 : 1 }}
           >
             {buscarJugador.isPending ? <ActivityIndicator size="small" color={Palette.black} /> : <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold }}>Buscar</Text>}
           </TouchableOpacity>
         </View>

         {foundPlayer ? (
           <View style={{ gap: Gap.md }}>
             <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}>
               <Image source={foundPlayer.foto ? { uri: foundPlayer.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 52, height: 52, borderRadius: Radius.full }} resizeMode="cover" />
               <View style={{ flex: 1, gap: Gap.micro }}>
                 <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{foundPlayer.nombre}</Text>
                 <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(foundPlayer.posicion)}</Text>
               </View>
             </View>
             {foundPlayer.yaPertenece ? (
               <>
                 <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.md, padding: Pad.md }}>
                   <Text style={{ color: Palette.cyan, fontFamily: Fonts.medium }}>Este jugador ya pertenece al equipo · Dorsal #{foundPlayer.dorsal ?? "-"}</Text>
                 </View>
                 <TouchableOpacity accessibilityRole="button" accessibilityLabel="Jugador ya agregado al equipo" accessibilityState={{ disabled: true }} disabled style={{ minHeight: 48, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center", justifyContent: "center", opacity: 0.45 }}>
                   <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold }}>Agregar al equipo</Text>
                 </TouchableOpacity>
               </>
             ) : (
               <>
                 <View style={{ gap: Gap.sm }}>
                   <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 13 }}>Dorsal</Text>
                   <TextInput
                     accessibilityLabel="Dorsal del jugador"
                     value={dorsal}
                     onChangeText={(value) => { setDorsal(value.replace(/\D/g, "")); setFlowError("") }}
                     onSubmitEditing={handleAssign}
                     returnKeyType="done"
                     placeholder="10"
                     placeholderTextColor={Palette.textMuted}
                     keyboardType="number-pad"
                     maxLength={3}
                     style={{ minHeight: 48, backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: Pad.base, color: Palette.text }}
                   />
                 </View>
                 <TouchableOpacity
                   accessibilityRole="button"
                   accessibilityLabel="Agregar jugador al equipo"
                   accessibilityState={{ disabled: assignJugador.isPending }}
                   disabled={assignJugador.isPending}
                   onPress={handleAssign}
                   style={{ minHeight: 48, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center", justifyContent: "center", opacity: assignJugador.isPending ? 0.6 : 1 }}
                 >
                   {assignJugador.isPending ? <ActivityIndicator size="small" color={Palette.black} /> : <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold }}>Agregar al equipo</Text>}
                 </TouchableOpacity>
               </>
             )}
           </View>
         ) : null}

         {flowError ? <Text accessibilityRole="alert" style={{ color: Palette.danger, fontFamily: Fonts.medium, fontSize: 13 }}>{flowError}</Text> : null}
         <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancelar búsqueda" onPress={closeSearch} style={{ minHeight: 48, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.danger, backgroundColor: Palette.danger10, alignItems: "center", justifyContent: "center" }}>
           <Text style={{ color: Palette.danger, fontFamily: Fonts.medium }}>Cancelar</Text>
         </TouchableOpacity>
         {keyboardH ? <View style={{ height: keyboardH }} /> : null}
       </AppBottomSheetModal>

      <Modal visible={countryPickerOpen} transparent animationType="slide" onRequestClose={() => setCountryPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: Palette.black, paddingTop: Pad.xl }}>
          <CountryModalProvider>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
              <TouchableOpacity onPress={() => setCountryPickerOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="arrow-back" size={24} color={Palette.text} />
              </TouchableOpacity>
              <Text style={{ flex: 1, textAlign: "center", color: Palette.text, fontSize: 18, fontFamily: Fonts.semiBold }}>Seleccionar país</Text>
            </View>
            <CountryFilter onChangeText={setCountryFilter} autoFocus={true} placeholder="Buscar país..." />
            <CountryList
              data={filteredCountries}
               onSelect={(country) => {
                 setCountryCode(country.cca2)
                 setCallingCode(country.callingCode[0] ?? "52")
                 setFoundPlayer(null)
                 setDorsal("")
                 setFlowError("")
                 setCountryPickerOpen(false)
                setCountryFilter("")
              }}
            />
          </CountryModalProvider>
        </View>
      </Modal>

      <ConfirmationModal
        visible={!!deleteTarget}
        title="Eliminar jugador"
        message={`¿Eliminar a **${deleteTarget?.nombre}** del equipo?`}
        highlightText={deleteTarget?.nombre ?? ""}
        confirmLabel="Eliminar"
        variant="danger"
        loading={removeJugadorFromTeam.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

    </View>
  )
}
