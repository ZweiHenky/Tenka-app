import { useState, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useLocalSearchParams, router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useTeam, useCreateTeam, useUpdateTeam } from "@/features/team/hooks/useTeams"
import { uploadToCloudinary } from "@/infrastructure/cloudinary/upload"
import { api } from "@/infrastructure/api/client"
import { useToast } from "@/shared/components/Toast"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"
import { authClient } from "@/infrastructure/auth/client"
import { canCreateTeam, type UserRole } from "@/domain/interfaces/user"

interface FormState {
  nombre: string
  logo: string
}

interface FormContentProps {
  teamId: string | null
  isEdit: boolean
  team: { id: string; nombre: string; logo: string | null }
}

function TeamFormContent({ teamId, isEdit, team }: FormContentProps) {
  const toast = useToast()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()

  const [form, setForm] = useState<FormState>(() => ({
    nombre: isEdit ? team.nombre : "",
    logo: isEdit ? (team.logo || "") : "",
  }))
  const [pickedLogo, setPickedLogo] = useState<{ uri: string; fileSize: number | null; mimeType: string | null } | null>(null)
  const [saving, setSaving] = useState(false)

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { toast.error("Se necesita acceso a la galería"); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setPickedLogo({ uri: result.assets[0].uri, fileSize: result.assets[0].fileSize ?? null, mimeType: result.assets[0].mimeType ?? null })
    }
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre del equipo es obligatorio"); return }

    let logoAssetId = ""
    setSaving(true)
    try {
      if (pickedLogo) {
        const { mediaAssetId } = await uploadToCloudinary(pickedLogo.uri, "TEAM_LOGO", { fileSize: pickedLogo.fileSize, mimeType: pickedLogo.mimeType })
        logoAssetId = mediaAssetId
      }
      if (isEdit) {
        await updateTeam.mutateAsync({ id: teamId!, data: { nombre: form.nombre.trim(), logoAssetId: logoAssetId || undefined } })
        toast.success("Cambios guardados")
      } else {
        await createTeam.mutateAsync({ nombre: form.nombre.trim(), logoAssetId: logoAssetId || undefined })
        toast.success("Equipo creado")
      }
      router.back()
    } catch (e: any) {
      if (logoAssetId) { await api.post(`/api/media/${logoAssetId}/abandon`).catch(() => undefined) }
      toast.error(e.message || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    const dirty = form.nombre !== (isEdit ? team.nombre : "") || form.logo !== (isEdit ? (team.logo || "") : "") || !!pickedLogo
    if (dirty) {
      Alert.alert("Descartar cambios", "¿Seguro que quieres salir? Los cambios no guardados se perderán.", [
        { text: "Seguir editando", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }, [form, isEdit, team, pickedLogo])

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={isEdit ? "Editar equipo" : "Nuevo equipo"} onBack={handleBack} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ gap: Gap.md, padding: Pad.base, paddingBottom: 48 }}
      >
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Información del equipo</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Nombre *</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: Dragones FC"
                placeholderTextColor={Palette.textMuted}
                value={form.nombre}
                onChangeText={(v) => setForm((p) => ({ ...p, nombre: v }))}
                maxLength={20}
              />
            </View>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Logo</Text>
              <TouchableOpacity
                onPress={pickLogo}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}
              >
                <View style={{ width: 48, height: 48, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.dark40 }}>
                  <Image source={pickedLogo?.uri ? { uri: pickedLogo.uri } : form.logo ? { uri: form.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 48, height: 48 }} resizeMode="cover" />
                </View>
                <Text style={{ color: Palette.white, fontSize: 14, fontFamily: Fonts.medium }}>Seleccionar imagen</Text>
              </TouchableOpacity>
              <Text style={{ color: Palette.textMuted, fontSize: 11, marginTop: 4 }}>200×200px — PNG o WebP (~20-50 KB)</Text>
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
              {isEdit ? "Guardar cambios" : "Crear equipo"}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  )
}

export default function TeamFormScreen() {
  const raw = useLocalSearchParams<{ teamId?: string }>()
  const teamId = Array.isArray(raw.teamId) ? raw.teamId[0] : raw.teamId
  const isEdit = Boolean(teamId)
  const { data: session } = authClient.useSession()
  const canCreate = canCreateTeam((session?.user as { rol?: UserRole } | undefined)?.rol)

  const { data: team, isLoading, error } = useTeam(teamId ?? undefined)

  if (isEdit && isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Editar equipo" />
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

  if (isEdit && !team) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Editar equipo" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (!isEdit && session?.user && !canCreate) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Nuevo equipo" onBack={() => router.back()} />
        <ErrorState message="No tienes permisos para crear equipos" fullScreen />
      </View>
    )
  }

  return (
    <AuthGate>
      <TeamFormContent
        key={isEdit ? teamId : "create"}
        teamId={teamId ?? null}
        isEdit={isEdit}
        team={team!}
      />
    </AuthGate>
  )
}
