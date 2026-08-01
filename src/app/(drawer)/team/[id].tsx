import { useEffect, useMemo, useState, useRef } from "react"
import { View, Text, TouchableOpacity, Image, Modal, TextInput, ActivityIndicator } from "react-native"
import { Flag, CountryModalProvider, CountryFilter, CountryList, getAllCountries, FlagType } from "react-native-country-picker-modal"
import type { Country, CountryCode } from "react-native-country-picker-modal"
import { router, useLocalSearchParams, useIsFocused } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { MaterialIcons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useTeam } from "@/features/team/hooks/useTeams"
import { useCreateJugador, useRemoveJugadorFromTeam, useJugadores } from "@/features/jugador/hooks/useJugadores"
import { POSICIONES_JUGADOR, type PosicionJugador } from "@/domain/interfaces/player"
import { divisionEquipoApi } from "@/features/division-equipo/api/division-equipo"
import { authClient } from "@/infrastructure/auth/client"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import PullToRefresh from "@/shared/components/PullToRefresh"
import EmptyState from "@/shared/components/EmptyState"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import CrudModal from "@/shared/components/CrudModal"
import { uploadToCloudinary } from "@/infrastructure/cloudinary/upload"
import { useToast } from "@/shared/components/Toast"

function emptyForm() {
  return { nombre: "", dorsal: "", posicion: "", edad: "", phoneNumber: "", foto: "", fotoPublicId: "" }
}

const PAISES_COMUNES: CountryCode[] = [
  "MX", "US", "CA", "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC",
  "GT", "HN", "NI", "PA", "PE", "PY", "SV", "UY", "VE", "ES",
]

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((p) => p.id === posicion)?.nombre ?? posicion
}

export default function TeamDetailScreen() {
  const toast = useToast()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: team, isLoading, error, refetch } = useTeam(id)
  const { data: jugadores = [], isLoading: loadingPlayers, refetch: refetchPlayers } = useJugadores(id)
  const { data: divisionLinks = [], isLoading: loadingDivisionLinks, refetch: refetchDivisionLinks } = useQuery({
    queryKey: ["division-equipos", "equipo", id],
    queryFn: () => divisionEquipoApi.findByEquipo(id!),
    enabled: !!id,
  })
  const createJugador = useCreateJugador()
  const removeJugadorFromTeam = useRemoveJugadorFromTeam()
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; jugadorId: string; nombre: string } | null>(null)
  const [tab, setTab] = useState<"jugadores" | "divisiones">("jugadores")
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(emptyForm())
  const [countryCode, setCountryCode] = useState<CountryCode>("MX")
  const [callingCode, setCallingCode] = useState("52")
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [countryFilter, setCountryFilter] = useState("")
  const [allCountries, setAllCountries] = useState<Country[]>([])
  const [uploading, setUploading] = useState(false)

  const newPlayerBtnRef = useRef<any>(null)
  const firstPlayerRef = useRef<any>(null)
  const divisionsTabRef = useRef<any>(null)
  const scrollRef = useRef<any>(null)
  const scrollOffsetRef = useRef(0)
  const tourStartedRef = useRef(false)
  const [firstPlayerReady, setFirstPlayerReady] = useState(false)

  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { data: session } = authClient.useSession()
  const { startTour, endTour } = useTourGuide()

  const blocked = createOpen || countryPickerOpen || !!deleteTarget || uploading || refreshing

  useEffect(() => {
    if (blocked) endTour()
  }, [blocked, endTour])

  useEffect(() => {
    if (!isFocused || isLoading || error || !team || !session?.user || tab !== "jugadores" || blocked) return
    if (tourStartedRef.current) return
    const init = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:team-detail-v1")
      if (seen === "completed") { tourStartedRef.current = true; return }
      if (!newPlayerBtnRef.current || !divisionsTabRef.current) return
      if (jugadores.length > 0 && (!firstPlayerRef.current || !firstPlayerReady)) return
      tourStartedRef.current = true
      const steps: any[] = [
        {
          id: "team-detail-add-player",
          targetRef: newPlayerBtnRef,
          title: "Registra jugadores",
          description: "Agrega jugadores con su dorsal, posición y teléfono para formar la plantilla del equipo.",
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
        targetRef: divisionsTabRef,
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

  const filteredCountries = useMemo(() => {
    if (!countryFilter) return allCountries
    const lower = countryFilter.toLowerCase()
    return allCountries.filter((c) => {
      const name = typeof c.name === "string" ? c.name : (c.name as any).common ?? ""
      return name.toLowerCase().includes(lower) || c.callingCode.some((cc) => cc.includes(countryFilter)) || c.cca2.toLowerCase().includes(lower)
    })
  }, [allCountries, countryFilter])

  const fields = [
    { name: "nombre", label: "Nombre", placeholder: "Nombre del jugador", required: true, maxLength: 40 },
    { name: "dorsal", label: "Dorsal", placeholder: "10", required: true, keyboardType: "numeric" as const, maxLength: 3 },
    { name: "posicion", label: "Posición", required: true, options: POSICIONES_JUGADOR.map((p) => ({ label: p.nombre, value: p.id })) },
    { name: "edad", label: "Edad", placeholder: "Opcional", keyboardType: "numeric" as const, maxLength: 3 },
  ]

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetch(), refetchPlayers(), refetchDivisionLinks()])
    } finally {
      setRefreshing(false)
    }
  }

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      toast.error("Se necesita acceso a la galería")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      setUploading(true)
      try {
        const { url, publicId } = await uploadToCloudinary(result.assets[0].uri)
        setForm((prev) => ({ ...prev, foto: url, fotoPublicId: publicId }))
      } catch {
        toast.error("No se pudo subir la foto")
      } finally {
        setUploading(false)
      }
    }
  }

  const handleCreate = async () => {
    if (!id || !form.nombre.trim() || !form.dorsal.trim() || !form.posicion || !form.phoneNumber.trim()) {
      toast.error("Nombre, dorsal, posición y teléfono son obligatorios")
      return
    }
    const dorsal = Number(form.dorsal)
    const edad = form.edad.trim() ? Number(form.edad) : undefined
    const phoneDigits = form.phoneNumber.replace(/\D/g, "")
    if (!Number.isInteger(dorsal) || (form.edad.trim() && !Number.isInteger(edad))) {
      toast.error("Dorsal y edad deben ser numéricos")
      return
    }
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      toast.error("Ingresa un teléfono válido")
      return
    }
    try {
      await createJugador.mutateAsync({
        nombre: form.nombre.trim(),
        dorsal,
        posicion: form.posicion as PosicionJugador,
        edad,
        telefono: `+${callingCode}${phoneDigits}`,
        foto: form.foto || undefined,
        fotoPublicId: form.fotoPublicId || undefined,
        equipoId: id,
      })
      setCreateOpen(false)
      setForm(emptyForm())
      setCountryCode("MX")
      setCallingCode("52")
      toast.success("Jugador registrado")
    } catch (e: any) {
      toast.error(e.message)
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
      <CustomHeader title="Detalle equipo" />
      <PullToRefresh scrollRef={scrollRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }} refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <View style={{ flexDirection: "row", backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setTab("jugadores")} style={{ flex: 1, paddingVertical: Pad.md, alignItems: "center", backgroundColor: tab === "jugadores" ? Palette.cyan : "transparent" }}>
              <Text style={{ color: tab === "jugadores" ? Palette.black : Palette.textSecondary, fontFamily: Fonts.semiBold }}>Jugadores</Text>
            </TouchableOpacity>
            <TouchableOpacity ref={divisionsTabRef} activeOpacity={0.8} onPress={() => setTab("divisiones")} style={{ flex: 1, paddingVertical: Pad.md, alignItems: "center", backgroundColor: tab === "divisiones" ? Palette.cyan : "transparent" }}>
              <Text style={{ color: tab === "divisiones" ? Palette.black : Palette.textSecondary, fontFamily: Fonts.semiBold }}>Divisiones</Text>
            </TouchableOpacity>
          </View>

          {tab === "jugadores" ? (
          <View style={{ gap: Gap.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Jugadores</Text>
              <TouchableOpacity ref={newPlayerBtnRef} onPress={() => setCreateOpen(true)} style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.sm, paddingHorizontal: Pad.md }}>
                <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 12 }}>Nuevo jugador</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: Palette.textMuted, fontSize: 12 }}>Todos los jugadores del equipo</Text>
            {loadingPlayers ? (
              <ActivityIndicator color={Palette.cyan} />
            ) : jugadores.length === 0 ? (
              <EmptyState message="Este equipo todavía no tiene jugadores" icon="groups" />
            ) : (
              jugadores.map((j, i) => {
                const dorsal = j.equipos?.[0]?.dorsal
                const card = (
                  <TouchableOpacity key={j.id} activeOpacity={0.8} onPress={() => router.push(`/(drawer)/player/${j.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm }}>
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
                    <TouchableOpacity key={link.divisionId} activeOpacity={0.8} onPress={() => router.push(`/(drawer)/team/${id}/divisions/${link.divisionId}`)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}>
                      <View style={{ width: 46, height: 46, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.cyan20 }}>
                        <Image source={division?.liga?.logo ? { uri: division.liga.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 46, height: 46 }} resizeMode="cover" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{division?.nombre ?? link.divisionId}</Text>
                        <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{division?.liga?.nombre ?? "Liga"}</Text>
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

      <CrudModal visible={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo jugador" fields={fields} values={form} onChange={(name, value) => setForm((prev) => ({ ...prev, [name]: value }))} onSave={handleCreate} saveLabel="Crear">
        <View style={{ gap: Gap.sm }}>
          <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 13 }}>Teléfono *</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <TouchableOpacity
              onPress={() => setCountryPickerOpen(true)}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, gap: Gap.sm }}
            >
              <Flag countryCode={countryCode} flagSize={24} />
              <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>+{callingCode}</Text>
            </TouchableOpacity>
            <TextInput
              value={form.phoneNumber}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phoneNumber: value }))}
              placeholder="555 123 4567"
              placeholderTextColor={Palette.textMuted}
              keyboardType="phone-pad"
              maxLength={18}
              style={{ flex: 1, backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: Pad.base, paddingVertical: Pad.md, color: Palette.text }}
            />
          </View>
          <Text style={{ color: Palette.textMuted, fontSize: 11 }}>Si el teléfono ya existe, se agregará ese jugador a este equipo.</Text>
        </View>
        <View style={{ gap: Gap.sm }}>
          <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 13 }}>Foto</Text>
          <TouchableOpacity onPress={uploading ? undefined : pickPhoto} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, padding: Pad.base }}>
            <View style={{ width: 48, height: 48, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.black }}>
              <Image source={form.foto ? { uri: form.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 48, height: 48 }} resizeMode="cover" />
            </View>
            {uploading ? <ActivityIndicator size="small" color={Palette.cyan} /> : <Text style={{ color: Palette.text, fontFamily: Fonts.medium }}>Seleccionar foto</Text>}
          </TouchableOpacity>
        </View>
      </CrudModal>

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
