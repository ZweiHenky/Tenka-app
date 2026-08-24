import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, BackHandler } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useLocalSearchParams, router, useNavigation } from "expo-router"
import type { NavigationAction } from "expo-router/build/react-navigation"
import * as ImagePicker from "expo-image-picker"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { api } from "@/infrastructure/api/client"
import { useLeague, useCreateLeague, useUpdateLeague } from "@/features/league/hooks/useLeagues"
import { authClient } from "@/infrastructure/auth/client"
import { uploadToCloudinary } from "@/infrastructure/cloudinary/upload"
import { useToast } from "@/shared/components/Toast"
import LocationPickerModal from "@/shared/components/LocationPickerModal"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { canCreateLeague, type UserRole } from "@/domain/interfaces/user"
import type { CreateLeagueInput } from "@/domain/interfaces/league"
import { createCourtDrafts, toCourtPayload, validateCourtConfig, type CourtDraft } from "@/features/league/utils/court-config"
import { FontAwesome6 } from "@expo/vector-icons"
import { buildLeagueSocialPayload, type LeagueSocialField } from "@/features/league/utils/social-links"

let nextCourtKey = 0

function newCourt(): CourtDraft {
  nextCourtKey += 1
  return { key: `new-court-${nextCourtKey}`, nombre: "", activa: true }
}

let nextRuleKey = 0

function newRule(): RuleDraft {
  nextRuleKey += 1
  return { key: `new-rule-${nextRuleKey}`, titulo: "", detalle: "" }
}

interface RuleDraft {
  key: string
  titulo: string
  detalle: string
}

const SOCIAL_NETWORKS: {
  field: LeagueSocialField
  label: string
  icon: string
  color: string
  placeholder: string
}[] = [
  { field: "facebook", label: "Facebook", icon: "facebook-f", color: "#1877F2", placeholder: "https://facebook.com/tu-liga" },
  { field: "x", label: "X", icon: "x-twitter", color: Palette.text, placeholder: "https://x.com/tu_liga" },
  { field: "instagram", label: "Instagram", icon: "instagram", color: "#E1306C", placeholder: "https://instagram.com/tu_liga" },
  { field: "tiktok", label: "TikTok", icon: "tiktok", color: Palette.text, placeholder: "https://tiktok.com/@tu_liga" },
]

interface FormState {
  nombre: string
  descripcion: string
  logo: string
  logoAssetId: string
  cancha: string
  coverAssetId: string
  multiplesCanchas: boolean
  canchas: CourtDraft[]
  usaArbitros: boolean
  arbitroNombres: string[]
  reglas: RuleDraft[]
  facebook: string
  x: string
  instagram: string
  tiktok: string
  ubicacionId: string
  ubicacionTexto: string
  ubicacionLat: string
  ubicacionLng: string
  ubicacionEstado: string
  ubicacionMunicipio: string
  ubicacionNombreCompleto: string
}

function normalizeForm(form: FormState) {
  return {
    nombre: form.nombre,
    descripcion: form.descripcion,
    logo: form.logo,
    logoAssetId: form.logoAssetId,
    cancha: form.cancha,
    coverAssetId: form.coverAssetId,
    multiplesCanchas: form.multiplesCanchas,
    canchas: form.canchas,
    usaArbitros: form.usaArbitros,
    arbitroNombres: form.arbitroNombres,
    reglas: form.reglas.map(({ titulo, detalle }) => ({ titulo, detalle })),
    facebook: form.facebook,
    x: form.x,
    instagram: form.instagram,
    tiktok: form.tiktok,
    ubicacionId: form.ubicacionId,
    ubicacionTexto: form.ubicacionTexto,
    ubicacionLat: form.ubicacionLat,
    ubicacionLng: form.ubicacionLng,
    ubicacionEstado: form.ubicacionEstado,
    ubicacionMunicipio: form.ubicacionMunicipio,
    ubicacionNombreCompleto: form.ubicacionNombreCompleto,
  }
}

const EMPTY_FORM: FormState = {
  nombre: "",
  descripcion: "",
  logo: "",
  logoAssetId: "",
  cancha: "",
  coverAssetId: "",
  multiplesCanchas: false,
  canchas: [],
  usaArbitros: false,
  arbitroNombres: [""],
  reglas: [],
  facebook: "",
  x: "",
  instagram: "",
  tiktok: "",
  ubicacionId: "",
  ubicacionTexto: "",
  ubicacionLat: "",
  ubicacionLng: "",
  ubicacionEstado: "",
  ubicacionMunicipio: "",
  ubicacionNombreCompleto: "",
}

interface FormContentProps {
  leagueId: string | null
  userId: string
  isEdit: boolean
  league: NonNullable<ReturnType<typeof useLeague>["data"]>
}

function LeagueFormContent({ leagueId, userId, isEdit, league }: FormContentProps) {
  const toast = useToast()
  const createLeague = useCreateLeague(userId)
  const updateLeague = useUpdateLeague()

  const initForm = (): FormState => {
    if (isEdit) {
      return {
        nombre: league.nombre,
        descripcion: league.descripcion,
        logo: league.logo || "",
        logoAssetId: "",
        cancha: league.cancha || "",
        coverAssetId: "",
        multiplesCanchas: league.multiplesCanchas ?? false,
        canchas: createCourtDrafts(league.canchas),
        usaArbitros: league.usaArbitros ?? false,
        arbitroNombres: (() => {
          const nombres = league.arbitros?.map((arbitro) => arbitro.nombre) ?? []
          if (league.usaArbitros) {
            return [...nombres, ...Array(Math.max(0, 2 - nombres.length)).fill("")]
          }
          return nombres.length > 0 ? nombres : [""]
        })(),
        reglas: league.reglas?.map((regla) => ({ key: `rule-${nextRuleKey++}`, titulo: regla.titulo, detalle: regla.detalle })) ?? [],
        facebook: league.facebook ?? "",
        x: league.x ?? "",
        instagram: league.instagram ?? "",
        tiktok: league.tiktok ?? "",
        ubicacionId: league.ubicacionId,
        ubicacionTexto: league.ubicacion?.nombreCompleto ?? "",
        ubicacionLat: "",
        ubicacionLng: "",
        ubicacionEstado: "",
        ubicacionMunicipio: "",
        ubicacionNombreCompleto: "",
      }
    }
    return EMPTY_FORM
  }

  const [initialForm] = useState<FormState>(initForm)
  const [form, setForm] = useState<FormState>(initialForm)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [picked, setPicked] = useState<Record<string, { uri: string; fileSize: number | null; mimeType: string | null }>>({})
  const [saving, setSaving] = useState(false)
  const [nombreError, setNombreError] = useState<string | null>(null)
  const [showDiscard, setShowDiscard] = useState(false)
  const navigation = useNavigation()
  const pendingActionRef = useRef<NavigationAction | null>(null)
  const allowLeaveRef = useRef(false)
  const savingRef = useRef(false)

  const dirty = useMemo(() => {
    return JSON.stringify(normalizeForm(form)) !== JSON.stringify(normalizeForm(initialForm)) || !!picked.logo || !!picked.cancha
  }, [form, initialForm, picked])

  const handleSave = async () => {
    if (savingRef.current) return
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return }

    const courtError = validateCourtConfig(form.multiplesCanchas, form.canchas)
    if (courtError) { toast.error(courtError); return }

    const arbitroNombres = form.arbitroNombres.map((n) => n.trim()).filter(Boolean)
    if (form.usaArbitros && arbitroNombres.length < 2) {
      toast.error("Agrega al menos 2 árbitros")
      return
    }
    if (new Set(arbitroNombres.map((n) => n.toLocaleLowerCase())).size !== arbitroNombres.length) {
      toast.error("Los nombres de los árbitros no pueden repetirse")
      return
    }

    const reglas = form.reglas
      .map((regla) => ({ titulo: regla.titulo.trim(), detalle: regla.detalle.trim() }))
      .filter((regla) => regla.titulo || regla.detalle)
    if (reglas.some((regla) => !regla.titulo)) {
      toast.error("Cada regla necesita un título")
      return
    }
    if (reglas.some((regla) => !regla.detalle)) {
      toast.error("Cada regla necesita un detalle")
      return
    }
    if (reglas.length > 30) {
      toast.error("Máximo 30 reglas o directivas")
      return
    }
    if (new Set(reglas.map((regla) => regla.titulo.toLocaleLowerCase())).size !== reglas.length) {
      toast.error("Los títulos de las reglas no pueden repetirse")
      return
    }

    const socialResult = buildLeagueSocialPayload(form, isEdit)
    if (socialResult.error) {
      toast.error(socialResult.error)
      return
    }

    let logoAssetId = form.logoAssetId
    let coverAssetId = form.coverAssetId
    const uploadedAssets: string[] = []
    savingRef.current = true
    setSaving(true)
    try {
      let ubicacionId = form.ubicacionId
      if (form.ubicacionLat && form.ubicacionLng) {
        const res = await api.post("/api/ubicaciones/find-or-create", {
          lat: Number(form.ubicacionLat),
          lng: Number(form.ubicacionLng),
          nombreCompleto: form.ubicacionNombreCompleto,
          estado: form.ubicacionEstado,
          municipio: form.ubicacionMunicipio,
        })
        ubicacionId = res.data.data.id
      }

      if (!ubicacionId) { toast.error("Debes seleccionar una ubicación"); return }

      if (picked.logo) {
        const { mediaAssetId } = await uploadToCloudinary(picked.logo.uri, "LEAGUE_LOGO", { fileSize: picked.logo.fileSize, mimeType: picked.logo.mimeType })
        logoAssetId = mediaAssetId
        uploadedAssets.push(mediaAssetId)
      }
      if (picked.cancha) {
        const { mediaAssetId } = await uploadToCloudinary(picked.cancha.uri, "LEAGUE_COVER", { fileSize: picked.cancha.fileSize, mimeType: picked.cancha.mimeType })
        coverAssetId = mediaAssetId
        uploadedAssets.push(mediaAssetId)
      }
      const payload: CreateLeagueInput = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        logoAssetId: logoAssetId || undefined,
        coverAssetId: coverAssetId || undefined,
        multiplesCanchas: form.multiplesCanchas,
        canchas: toCourtPayload(form.canchas),
        usaArbitros: form.usaArbitros,
        arbitros: form.usaArbitros && arbitroNombres.length > 0 ? arbitroNombres.map((nombre) => ({ nombre })) : undefined,
        reglas: isEdit ? reglas : (reglas.length > 0 ? reglas : undefined),
        ...socialResult.payload,
        ubicacionId,
      }

      if (isEdit) {
        await updateLeague.mutateAsync({ id: leagueId!, data: payload })
        toast.success("Cambios guardados")
      } else {
        await createLeague.mutateAsync(payload)
        toast.success("Liga creada")
      }
      allowLeaveRef.current = true
      router.back()
    } catch (e: any) {
      for (const id of uploadedAssets) { await api.post(`/api/media/${id}/abandon`).catch(() => undefined) }
      if (e?.response?.status === 409) {
        setNombreError("Ya existe una liga con ese nombre")
        toast.error("Ya existe una liga con ese nombre")
      } else {
        setNombreError(null)
        toast.error(e.message || "Error al guardar")
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    if (dirty) {
      setShowDiscard(true)
    } else {
      router.back()
    }
  }, [dirty])

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current || !dirty) return
      e.preventDefault()
      pendingActionRef.current = e.data.action
      setShowDiscard(true)
    })
    return sub
  }, [navigation, dirty])

  useEffect(() => {
    if (!dirty) return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowDiscard(true)
      return true
    })
    return () => sub.remove()
  }, [dirty])

  const pickImage = async (field: string, aspect: [number, number]) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { toast.error("Se necesita acceso a la galería"); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect, quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      setPicked((p) => ({ ...p, [field]: { uri: result.assets[0].uri, fileSize: result.assets[0].fileSize ?? null, mimeType: result.assets[0].mimeType ?? null } }))
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={isEdit ? "Editar liga" : "Nueva liga"} onBack={handleBack} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ gap: Gap.md, padding: Pad.base, paddingBottom: 48 }}
      >
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Información general</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Nombre *</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: nombreError ? Palette.danger : Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: Apertura 2026"
                placeholderTextColor={Palette.textMuted}
                value={form.nombre}
                onChangeText={(v) => { setForm((p) => ({ ...p, nombre: v })); if (nombreError) setNombreError(null) }}
                maxLength={20}
              />
              {nombreError ? (
                <Text style={{ color: Palette.danger, fontSize: 12, marginTop: 4 }}>{nombreError}</Text>
              ) : null}
            </View>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Descripción</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text, minHeight: 80, textAlignVertical: "top" }}
                placeholder="Descripción de la liga"
                placeholderTextColor={Palette.textMuted}
                multiline
                value={form.descripcion}
                onChangeText={(v) => setForm((p) => ({ ...p, descripcion: v }))}
                maxLength={150}
              />
              <Text style={{ fontSize: 11, color: Palette.textMuted, textAlign: "right", marginTop: 2 }}>{form.descripcion.length}/150</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Ubicación *</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <TouchableOpacity onPress={() => setShowLocationPicker(true)}>
              <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, minHeight: 42, justifyContent: "center" }}>
                {form.ubicacionTexto ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ flex: 1, fontSize: 15, color: Palette.white }}>{form.ubicacionTexto}</Text>
                    <Text style={{ color: Palette.cyan, fontFamily: Fonts.medium, fontSize: 14 }}>Cambiar</Text>
                  </View>
                ) : (
                  <Text style={{ color: Palette.textMuted, fontSize: 15 }}>Seleccionar ubicación</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Imágenes</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Logo</Text>
              <TouchableOpacity
                onPress={() => pickImage("logo", [1, 1])}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
              >
                <View style={{ width: 48, height: 48, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.dark40 }}>
                  <Image source={picked.logo?.uri ? { uri: picked.logo.uri } : form.logo ? { uri: form.logo } : require("@/assets/ejemplos/logo.png")} style={{ width: 48, height: 48 }} resizeMode="cover" />
                </View>
                <Text style={{ color: Palette.white, fontSize: 14, fontFamily: Fonts.medium }}>Seleccionar imagen</Text>
              </TouchableOpacity>
              <Text style={{ color: Palette.textMuted, fontSize: 11, marginTop: 4 }}>200×200px — PNG o WebP (~20-50 KB)</Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Imagen de portada del campo</Text>
              <TouchableOpacity
                onPress={() => pickImage("cancha", [16, 9])}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
              >
                <View style={{ width: 64, height: 48, borderRadius: Radius.md, overflow: "hidden", backgroundColor: Palette.dark40 }}>
                  <Image source={picked.cancha?.uri ? { uri: picked.cancha.uri } : form.cancha ? { uri: form.cancha } : require("@/assets/ejemplos/cancha.png")} style={{ width: 64, height: 48 }} resizeMode="cover" />
                </View>
                <Text style={{ color: Palette.white, fontSize: 14, fontFamily: Fonts.medium }}>Seleccionar imagen</Text>
              </TouchableOpacity>
              <Text style={{ color: Palette.textMuted, fontSize: 11, marginTop: 4 }}>Solo es la imagen principal de la liga, no una cancha programable. 1200×675px, 16:9.</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Canchas programables</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <TouchableOpacity
              onPress={() => setForm((previous) => {
                const multiplesCanchas = !previous.multiplesCanchas
                if (!multiplesCanchas) return { ...previous, multiplesCanchas }

                const activeCount = previous.canchas.filter((court) => court.activa).length
                return {
                  ...previous,
                  multiplesCanchas,
                  canchas: [...previous.canchas, ...Array.from({ length: Math.max(0, 2 - activeCount) }, newCourt)],
                }
              })}
              style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: form.multiplesCanchas ? Palette.cyan : Palette.border,
                backgroundColor: form.multiplesCanchas ? Palette.cyan : "transparent", alignItems: "center", justifyContent: "center",
              }}>
                {form.multiplesCanchas && <Text style={{ color: Palette.black, fontSize: 14, fontFamily: Fonts.bold }}>✓</Text>}
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: Palette.text, fontFamily: Fonts.medium }}>¿Programas partidos en varias canchas?</Text>
            </TouchableOpacity>

            {form.multiplesCanchas && (
              <>
                {form.canchas.map((court, index) => (
                  <View key={court.key} style={{ gap: Gap.sm, padding: Pad.md, borderRadius: Radius.md, borderWidth: 1, borderColor: court.activa ? Palette.border : Palette.warning, backgroundColor: Palette.surfaceLight }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Gap.sm }}>
                      <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold }}>Cancha {index + 1}</Text>
                      {!court.activa && (
                        <View style={{ backgroundColor: Palette.warning10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
                          <Text style={{ color: Palette.warning, fontSize: 11, fontFamily: Fonts.semiBold }}>Inactiva</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                      <TextInput
                        style={{ flex: 1, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                        placeholder="Ej: Cancha principal"
                        placeholderTextColor={Palette.textMuted}
                        value={court.nombre}
                        onChangeText={(nombre) => setForm((previous) => ({
                          ...previous,
                          canchas: previous.canchas.map((item) => item.key === court.key ? { ...item, nombre } : item),
                        }))}
                        maxLength={50}
                      />
                      <TouchableOpacity
                        onPress={() => setForm((previous) => ({
                          ...previous,
                          canchas: court.id
                            ? previous.canchas.map((item) => item.key === court.key ? { ...item, activa: !item.activa } : item)
                            : previous.canchas.filter((item) => item.key !== court.key),
                        }))}
                        style={{ padding: Pad.sm }}
                      >
                        <Text style={{ color: court.activa ? Palette.danger : Palette.success, fontSize: 13, fontFamily: Fonts.semiBold }}>
                          {court.id ? (court.activa ? "Desactivar" : "Reactivar") : "Quitar"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setForm((previous) => ({ ...previous, canchas: [...previous.canchas, newCourt()] }))}
                  style={{ paddingVertical: Pad.sm }}
                >
                  <Text style={{ color: Palette.cyan, fontSize: 14, fontFamily: Fonts.medium }}>+ Agregar cancha</Text>
                </TouchableOpacity>
                <Text style={{ color: Palette.textMuted, fontSize: 11 }}>Se requieren al menos 2 canchas activas con nombres únicos. Las canchas inactivas se conservan para el historial.</Text>
              </>
            )}
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Reglas y directivas</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            {form.reglas.map((regla, index) => (
              <View key={regla.key} style={{ gap: Gap.sm, padding: Pad.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surfaceLight }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Gap.sm }}>
                  <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold }}>Regla {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => setForm((p) => ({ ...p, reglas: p.reglas.filter((item) => item.key !== regla.key) }))}
                    style={{ padding: Pad.sm }}
                  >
                    <Text style={{ color: Palette.danger, fontSize: 18, fontFamily: Fonts.bold }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={{ borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                  placeholder="Ej: Puntualidad"
                  placeholderTextColor={Palette.textMuted}
                  value={regla.titulo}
                  onChangeText={(titulo) => setForm((p) => ({
                    ...p,
                    reglas: p.reglas.map((item) => item.key === regla.key ? { ...item, titulo } : item),
                  }))}
                  maxLength={60}
                />
                <TextInput
                  style={{ borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text, minHeight: 80, textAlignVertical: "top" }}
                  placeholder="Detalle de la regla"
                  placeholderTextColor={Palette.textMuted}
                  multiline
                  value={regla.detalle}
                  onChangeText={(detalle) => setForm((p) => ({
                    ...p,
                    reglas: p.reglas.map((item) => item.key === regla.key ? { ...item, detalle } : item),
                  }))}
                  maxLength={500}
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setForm((p) => ({ ...p, reglas: [...p.reglas, newRule()] }))}
              style={{ paddingVertical: Pad.sm }}
            >
              <Text style={{ color: Palette.cyan, fontSize: 14, fontFamily: Fonts.medium }}>+ Agregar regla</Text>
            </TouchableOpacity>
            <Text style={{ color: Palette.textMuted, fontSize: 11 }}>Hasta 30 reglas o directivas. Los títulos deben ser únicos.</Text>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Redes sociales</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            {SOCIAL_NETWORKS.map((social) => (
              <View key={social.field}>
                <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>{social.label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base }}>
                  <FontAwesome6 name={social.icon} size={18} color={social.color} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                    placeholder={social.placeholder}
                    placeholderTextColor={Palette.textMuted}
                    value={form[social.field]}
                    onChangeText={(value) => setForm((previous) => ({ ...previous, [social.field]: value }))}
                    keyboardType="url"
                    textContentType="URL"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={500}
                  />
                </View>
              </View>
            ))}
            <Text style={{ color: Palette.textMuted, fontSize: 11 }}>Opcional. Usa la URL completa que comience con https://</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Palette.black} />
          ) : (
            <Text style={{ fontSize: 16, fontFamily: Fonts.semiBold, color: Palette.black }}>
              {isEdit ? "Guardar cambios" : "Crear liga"}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <LocationPickerModal
        visible={showLocationPicker}
        currentText={form.ubicacionTexto}
        onSelect={(place) => {
          setForm((p) => ({
            ...p,
            ubicacionTexto: place.texto,
            ubicacionLat: String(place.lat),
            ubicacionLng: String(place.lng),
            ubicacionEstado: place.estado,
            ubicacionMunicipio: place.municipio,
            ubicacionNombreCompleto: place.nombreCompleto,
            ubicacionId: "",
          }))
        }}
        onClose={() => setShowLocationPicker(false)}
      />
      <ConfirmationModal
        visible={showDiscard}
        title="Descartar cambios"
        message="¿Seguro que quieres salir? Los cambios no guardados se perderán."
        confirmLabel="Salir"
        cancelLabel="Seguir editando"
        variant="danger"
        onConfirm={() => {
          const action = pendingActionRef.current
          pendingActionRef.current = null
          allowLeaveRef.current = true
          setShowDiscard(false)
          requestAnimationFrame(() => {
            if (action) navigation.dispatch(action)
            else router.back()
          })
        }}
        onClose={() => {
          pendingActionRef.current = null
          setShowDiscard(false)
        }}
      />
    </View>
  )
}

export default function LeagueFormScreen() {
  const raw = useLocalSearchParams<{ leagueId?: string }>()
  const leagueId = Array.isArray(raw.leagueId) ? raw.leagueId[0] : raw.leagueId
  const isEdit = Boolean(leagueId)
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id ?? ""
  const canCreate = canCreateLeague((session?.user as { rol?: UserRole } | undefined)?.rol)

  const { data: league, isLoading, error } = useLeague(leagueId ?? "")

  if (isEdit && isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Editar liga" />
        <LoadingScreen />
      </View>
    )
  }

  if (isEdit && error) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" onBack={() => router.back()} />
        <ErrorState message={(error as Error).message} fullScreen />
      </View>
    )
  }

  if (isEdit && !league) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Editar liga" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (!userId) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Palette.text, fontSize: 16 }}>Debes iniciar sesión</Text>
      </View>
    )
  }

  if (!isEdit && !canCreate) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Nueva liga" onBack={() => router.back()} />
        <ErrorState message="No tienes permisos para crear ligas" fullScreen />
      </View>
    )
  }

  return (
    <AuthGate>
      <LeagueFormContent
        key={isEdit ? leagueId : "create"}
        leagueId={leagueId ?? null}
        userId={userId}
        isEdit={isEdit}
        league={league!}
      />
    </AuthGate>
  )
}
