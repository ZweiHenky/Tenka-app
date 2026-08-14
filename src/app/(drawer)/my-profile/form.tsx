import { useState, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useMyProfile, useCreateMyProfile, useUpdateMyProfile } from "@/features/jugador/hooks/useJugadores"
import { POSICIONES_JUGADOR, type PosicionJugador } from "@/domain/interfaces/player"
import { uploadToCloudinary } from "@/infrastructure/cloudinary/upload"
import { api } from "@/infrastructure/api/client"
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
  const [foto] = useState(jugador?.foto ?? "")
  const [pickedPhoto, setPickedPhoto] = useState<{ uri: string; fileSize: number | null; mimeType: string | null } | null>(null)
  const [saving, setSaving] = useState(false)

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { toast.error("Se necesita acceso a la galería"); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      setPickedPhoto({ uri: result.assets[0].uri, fileSize: result.assets[0].fileSize ?? null, mimeType: result.assets[0].mimeType ?? null })
    }
  }

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error("El nombre es obligatorio"); return }
    if (!posicion) { toast.error("Selecciona una posición"); return }

    let photoAssetId = ""
    setSaving(true)
    try {
      if (pickedPhoto) {
        const { mediaAssetId } = await uploadToCloudinary(pickedPhoto.uri, "PLAYER_PHOTO", { fileSize: pickedPhoto.fileSize, mimeType: pickedPhoto.mimeType })
        photoAssetId = mediaAssetId
      }
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        posicion: posicion as PosicionJugador,
        photoAssetId: photoAssetId || undefined,
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
      if (photoAssetId) { await api.post(`/api/media/${photoAssetId}/abandon`).catch(() => undefined) }
      toast.error(e.message || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    const dirty = nombre !== (jugador?.nombre ?? "") ||
      posicion !== (jugador?.posicion ?? "") ||
      edad !== (jugador?.edad != null ? String(jugador.edad) : "") ||
      foto !== (jugador?.foto ?? "") ||
      !!pickedPhoto
    if (dirty) {
      Alert.alert("Descartar cambios", "¿Seguro que quieres salir? Los cambios no guardados se perderán.", [
        { text: "Seguir editando", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }, [nombre, posicion, edad, foto, jugador, pickedPhoto])

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
                onPress={pickPhoto}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
              >
                <View style={{ width: 48, height: 48, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.dark40 }}>
                  <Image source={pickedPhoto?.uri ? { uri: pickedPhoto.uri } : foto ? { uri: foto } : require("@/assets/ejemplos/logo.png")} style={{ width: 48, height: 48 }} resizeMode="cover" />
                </View>
                <Text style={{ color: Palette.white, fontSize: 14, fontFamily: Fonts.medium }}>Seleccionar foto</Text>
              </TouchableOpacity>
            </View>
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
              {isEdit ? "Guardar cambios" : "Crear perfil"}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  )
}
