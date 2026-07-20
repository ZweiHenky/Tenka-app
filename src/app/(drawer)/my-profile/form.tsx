import { useState, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useMyProfile, useCreateMyProfile, useUpdateMyProfile } from "@/features/jugador/hooks/useJugadores"
import { POSICIONES_JUGADOR, type PosicionJugador } from "@/domain/interfaces/player"
import { uploadToCloudinary } from "@/infrastructure/cloudinary/upload"
import { useToast } from "@/shared/components/Toast"
import { SelectField } from "@/shared/components/SelectField"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"

const POSICION_OPTIONS = POSICIONES_JUGADOR.map((p) => ({ id: p.id, nombre: p.nombre }))

export default function MyProfileFormScreen() {
  const toast = useToast()
  const { data: jugador, isLoading } = useMyProfile()
  const createProfile = useCreateMyProfile()
  const updateProfile = useUpdateMyProfile()
  const isEdit = !!jugador

  const [nombre, setNombre] = useState(jugador?.nombre ?? "")
  const [posicion, setPosicion] = useState<string>(jugador?.posicion ?? "")
  const [edad, setEdad] = useState(jugador?.edad != null ? String(jugador.edad) : "")
  const [foto, setFoto] = useState(jugador?.foto ?? "")
  const [fotoPublicId, setFotoPublicId] = useState((jugador as any)?.fotoPublicId ?? "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { toast.error("Se necesita acceso a la galería"); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      setUploading(true)
      try {
        const { url, publicId } = await uploadToCloudinary(result.assets[0].uri)
        setFoto(url)
        setFotoPublicId(publicId)
      } catch {
        toast.error("No se pudo subir la foto")
      } finally {
        setUploading(false)
      }
    }
  }

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error("El nombre es obligatorio"); return }
    if (!posicion) { toast.error("Selecciona una posición"); return }
    if (uploading) { toast.error("Espera a que termine la subida"); return }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        posicion: posicion as PosicionJugador,
        foto: foto || undefined,
        fotoPublicId: fotoPublicId || undefined,
        edad: edad.trim() ? Number(edad) : undefined,
      }

      if (isEdit) {
        await updateProfile.mutateAsync(payload)
        toast.success("Perfil actualizado")
      } else {
        await createProfile.mutateAsync(payload as any)
        toast.success("Perfil creado")
      }
      router.back()
    } catch (e: any) {
      toast.error(e.message || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    const dirty = nombre !== (jugador?.nombre ?? "") ||
      posicion !== (jugador?.posicion ?? "") ||
      edad !== (jugador?.edad != null ? String(jugador.edad) : "") ||
      foto !== (jugador?.foto ?? "")
    if (dirty) {
      Alert.alert("Descartar cambios", "¿Seguro que quieres salir? Los cambios no guardados se perderán.", [
        { text: "Seguir editando", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }, [nombre, posicion, edad, foto, jugador])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title={isEdit ? "Editar perfil" : "Crear perfil"} />
        <LoadingScreen />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={isEdit ? "Editar perfil" : "Crear perfil"} onBack={handleBack} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ gap: Gap.md, padding: Pad.base, paddingBottom: 48 }}
      >
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Información del jugador</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Nombre *</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Tu nombre completo"
                placeholderTextColor={Palette.textMuted}
                value={nombre}
                onChangeText={setNombre}
                maxLength={80}
              />
            </View>
            <SelectField label="Posición *" current={posicion} options={POSICION_OPTIONS} onSelect={setPosicion} />
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Edad</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: 25"
                placeholderTextColor={Palette.textMuted}
                keyboardType="number-pad"
                value={edad}
                onChangeText={setEdad}
                maxLength={3}
              />
            </View>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Foto</Text>
              <TouchableOpacity
                onPress={uploading ? undefined : pickPhoto}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
              >
                <View style={{ width: 48, height: 48, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.dark40 }}>
                  <Image source={foto ? { uri: foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 48, height: 48 }} resizeMode="cover" />
                </View>
                {uploading ? (
                  <ActivityIndicator color={Palette.cyan} size="small" />
                ) : (
                  <Text style={{ color: Palette.white, fontSize: 14, fontFamily: Fonts.medium }}>Seleccionar foto</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || uploading}
          style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", opacity: (saving || uploading) ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Palette.black} />
          ) : (
            <Text style={{ fontSize: 16, fontFamily: Fonts.semiBold, color: Palette.black }}>
              {isEdit ? "Guardar cambios" : "Crear perfil"}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  )
}
