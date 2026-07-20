import { useState, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useLocalSearchParams, router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { api } from "@/infrastructure/api/client"
import { useLeague, useCreateLeague, useUpdateLeague } from "@/features/league/hooks/useLeagues"
import { useLookups } from "@/features/league/hooks/useLookups"
import { authClient } from "@/infrastructure/auth/client"
import { uploadToCloudinary } from "@/infrastructure/cloudinary/upload"
import { useToast } from "@/shared/components/Toast"
import LocationPickerModal from "@/shared/components/LocationPickerModal"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"

interface FormState {
  nombre: string
  descripcion: string
  logo: string
  logoPublicId: string
  cancha: string
  canchaPublicId: string
  multiplesCanchas: boolean
  canchaNombres: string[]
  ubicacionId: string
  ubicacionTexto: string
  ubicacionLat: string
  ubicacionLng: string
  ubicacionEstado: string
  ubicacionMunicipio: string
  ubicacionNombreCompleto: string
}

const EMPTY_FORM: FormState = {
  nombre: "",
  descripcion: "",
  logo: "",
  logoPublicId: "",
  cancha: "",
  canchaPublicId: "",
  multiplesCanchas: false,
  canchaNombres: [""],
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
  isEdit: boolean
  league: NonNullable<ReturnType<typeof useLeague>["data"]>
  userId: string
}

function LeagueFormContent({ leagueId, isEdit, league, userId }: FormContentProps) {
  const toast = useToast()
  const createLeague = useCreateLeague()
  const updateLeague = useUpdateLeague()
  const lookups = useLookups()

  const initForm = (): FormState => {
    if (isEdit) {
      return {
        nombre: league.nombre,
        descripcion: league.descripcion,
        logo: league.logo || "",
        logoPublicId: (league as any).logoPublicId || "",
        cancha: league.cancha || "",
        canchaPublicId: (league as any).canchaPublicId || "",
        multiplesCanchas: (league as any).multiplesCanchas ?? false,
        canchaNombres: (() => {
          const nombres = (league as any).canchas?.map((c: any) => c.nombre) ?? []
          if (!(league as any).multiplesCanchas) return nombres.length > 0 ? nombres : [""]
          return [...nombres, ...Array(Math.max(0, 2 - nombres.length)).fill("")]
        })(),
        ubicacionId: league.ubicacionId,
        ubicacionTexto: league.ubicacion?.nombreCompleto ?? lookups.ubicaciones.find((u) => u.id === league.ubicacionId)?.nombreCompleto ?? "",
        ubicacionLat: "",
        ubicacionLng: "",
        ubicacionEstado: "",
        ubicacionMunicipio: "",
        ubicacionNombreCompleto: "",
      }
    }
    return EMPTY_FORM
  }

  const [form, setForm] = useState<FormState>(initForm)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return }

    const canchaNombres = form.canchaNombres.map((n) => n.trim()).filter(Boolean)
    if (form.multiplesCanchas && canchaNombres.length < 2) {
      toast.error("Agrega al menos 2 canchas")
      return
    }
    if (new Set(canchaNombres.map((n) => n.toLocaleLowerCase())).size !== canchaNombres.length) {
      toast.error("Los nombres de las canchas no pueden repetirse")
      return
    }

    let ubicacionId = form.ubicacionId
    if (form.ubicacionLat && form.ubicacionLng) {
      try {
        const res = await api.post("/api/ubicaciones/find-or-create", {
          lat: Number(form.ubicacionLat),
          lng: Number(form.ubicacionLng),
          nombreCompleto: form.ubicacionNombreCompleto,
          estado: form.ubicacionEstado,
          municipio: form.ubicacionMunicipio,
        })
        ubicacionId = res.data.data.id
      } catch (e: any) {
        toast.error(e.message)
        return
      }
    }

    if (!ubicacionId) { toast.error("Debes seleccionar una ubicación"); return }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        logo: form.logo || undefined,
        logoPublicId: form.logoPublicId || undefined,
        cancha: form.cancha || undefined,
        canchaPublicId: form.canchaPublicId || undefined,
        multiplesCanchas: form.multiplesCanchas,
        canchas: form.multiplesCanchas && canchaNombres.length > 0 ? canchaNombres.map((nombre) => ({ nombre })) : undefined,
        ubicacionId,
        userId,
      }

      if (isEdit) {
        await updateLeague.mutateAsync({ id: leagueId!, data: payload })
        toast.success("Cambios guardados")
      } else {
        await createLeague.mutateAsync(payload as any)
        toast.success("Liga creada")
      }
      router.back()
    } catch (e: any) {
      toast.error(e.message || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    const dirty = Object.entries(form).some(([k, v]) => {
      if (k === "nombre") return v !== (isEdit ? league.nombre : "")
      if (k === "descripcion") return v !== (isEdit ? league.descripcion : "")
      if (k.startsWith("ubicacion")) return v !== ""
      if (k === "logo") return v !== (isEdit ? (league.logo || "") : "")
      if (k === "cancha") return v !== (isEdit ? (league.cancha || "") : "")
      if (k === "multiplesCanchas") return v !== (isEdit ? (league as any).multiplesCanchas ?? false : false)
      if (k === "canchaNombres") return JSON.stringify(v) !== JSON.stringify(isEdit ? (((league as any).canchas?.length ? (league as any).canchas.map((c: any) => c.nombre) : [""])) : [""])
      return v !== ""
    })
    if (dirty) {
      Alert.alert("Descartar cambios", "¿Seguro que quieres salir? Los cambios no guardados se perderán.", [
        { text: "Seguir editando", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }, [form, isEdit, league])

  const pickImage = async (field: string, aspect: [number, number]) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { toast.error("Se necesita acceso a la galería"); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect, quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      setUploading(field)
      try {
        const { url, publicId } = await uploadToCloudinary(result.assets[0].uri)
        const publicIdField = `${field}PublicId`
        setForm((p) => ({ ...p, [field]: url, [publicIdField]: publicId }))
      } catch {
        toast.error("No se pudo subir la imagen")
      } finally {
        setUploading(null)
      }
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
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: Apertura 2026"
                placeholderTextColor={Palette.textMuted}
                value={form.nombre}
                onChangeText={(v) => setForm((p) => ({ ...p, nombre: v }))}
                maxLength={20}
              />
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
                onPress={uploading === "logo" ? undefined : () => pickImage("logo", [1, 1])}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
              >
                <View style={{ width: 48, height: 48, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.dark40 }}>
                  <Image source={form.logo ? { uri: form.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 48, height: 48 }} resizeMode="cover" />
                </View>
                {uploading === "logo" ? (
                  <ActivityIndicator color={Palette.cyan} size="small" />
                ) : (
                  <Text style={{ color: Palette.white, fontSize: 14, fontFamily: Fonts.medium }}>Seleccionar imagen</Text>
                )}
              </TouchableOpacity>
              <Text style={{ color: Palette.textMuted, fontSize: 11, marginTop: 4 }}>200×200px — PNG o WebP (~20-50 KB)</Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Campo / Cancha</Text>
              <TouchableOpacity
                onPress={uploading === "cancha" ? undefined : () => pickImage("cancha", [16, 9])}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
              >
                <View style={{ width: 64, height: 48, borderRadius: Radius.md, overflow: "hidden", backgroundColor: Palette.dark40 }}>
                  <Image source={form.cancha ? { uri: form.cancha } : require("@/assets/ejemplos/campo.jpg")} style={{ width: 64, height: 48 }} resizeMode="cover" />
                </View>
                {uploading === "cancha" ? (
                  <ActivityIndicator color={Palette.cyan} size="small" />
                ) : (
                  <Text style={{ color: Palette.white, fontSize: 14, fontFamily: Fonts.medium }}>Seleccionar imagen</Text>
                )}
              </TouchableOpacity>
              <Text style={{ color: Palette.textMuted, fontSize: 11, marginTop: 4 }}>1200×675px — 16:9, JPEG 80% (~200-400 KB)</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Canchas</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <TouchableOpacity
              onPress={() => {
                if (form.multiplesCanchas && form.canchaNombres.some((n) => n.trim())) {
                  Alert.alert(
                    "Desactivar canchas múltiples",
                    "Se perderán las canchas agregadas. ¿Continuar?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Sí", style: "destructive", onPress: () => setForm((p) => ({ ...p, multiplesCanchas: false, canchaNombres: [""] })) },
                    ]
                  )
                } else {
                  setForm((p) => ({
                    ...p,
                    multiplesCanchas: !p.multiplesCanchas,
                    canchaNombres: p.multiplesCanchas ? [""] : ["", ""],
                  }))
                }
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: form.multiplesCanchas ? Palette.cyan : Palette.border,
                backgroundColor: form.multiplesCanchas ? Palette.cyan : "transparent",
                alignItems: "center", justifyContent: "center",
              }}>
                {form.multiplesCanchas && <Text style={{ color: Palette.black, fontSize: 14, fontFamily: Fonts.bold }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.medium }}>Múltiples canchas</Text>
            </TouchableOpacity>

            {form.multiplesCanchas && (
              <>
                {form.canchaNombres.map((nombre, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                    <TextInput
                      style={{
                        flex: 1, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border,
                        paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text,
                      }}
                      placeholder={idx === 0 ? "Ej: Cancha 1" : `Cancha ${idx + 1}`}
                      placeholderTextColor={Palette.textMuted}
                      value={nombre}
                      onChangeText={(v) => {
                        const copy = [...form.canchaNombres]
                        copy[idx] = v
                        setForm((p) => ({ ...p, canchaNombres: copy }))
                      }}
                      maxLength={50}
                    />
                    {form.canchaNombres.length > 2 && (
                      <TouchableOpacity
                        onPress={() => setForm((p) => ({ ...p, canchaNombres: p.canchaNombres.filter((_, i) => i !== idx) }))}
                        style={{ padding: Pad.sm }}
                      >
                        <Text style={{ color: Palette.danger, fontSize: 18, fontFamily: Fonts.bold }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setForm((p) => ({ ...p, canchaNombres: [...p.canchaNombres, ""] }))}
                  style={{ paddingVertical: Pad.sm }}
                >
                  <Text style={{ color: Palette.cyan, fontSize: 14, fontFamily: Fonts.medium }}>+ Agregar cancha</Text>
                </TouchableOpacity>
                <Text style={{ color: Palette.textMuted, fontSize: 11 }}>Las canchas se comparten entre todas las divisiones de la liga.</Text>
              </>
            )}
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
    </View>
  )
}

export default function LeagueFormScreen() {
  const raw = useLocalSearchParams<{ leagueId?: string }>()
  const leagueId = Array.isArray(raw.leagueId) ? raw.leagueId[0] : raw.leagueId
  const isEdit = Boolean(leagueId)
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id ?? ""

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

  return (
    <AuthGate>
      <LeagueFormContent
        key={isEdit ? leagueId : "create"}
        leagueId={leagueId ?? null}
        isEdit={isEdit}
        league={league!}
        userId={userId}
      />
    </AuthGate>
  )
}
