import { useState, useMemo, useEffect, useCallback } from "react"
import { Modal, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"
import { Flag, CountryModalProvider, CountryFilter, CountryList, getAllCountries, FlagType } from "react-native-country-picker-modal"
import type { CountryCode, Country } from "react-native-country-picker-modal"
import { MaterialIcons } from "@expo/vector-icons"
import { authClient } from "@/infrastructure/auth/client"
import { getAuthErrorMessage } from "@/infrastructure/auth/errors"
import { uploadToCloudinary } from "@/infrastructure/cloudinary/upload"
import { api } from "@/infrastructure/api/client"
import { useToast } from "@/shared/components/Toast"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import CustomHeader from "@/shared/components/CustomHeader"

const PAISES_COMUNES: CountryCode[] = [
  "MX", "US", "CA", "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC",
  "GT", "HN", "NI", "PA", "PE", "PY", "SV", "UY", "VE",
  "ES",
]

export default function AccountEditScreen() {
  const toast = useToast()
  const { data: session, refetch: refetchSession } = authClient.useSession()
  const user = session?.user
  const currentName = user?.name ?? ""
  const currentPhone = (user as any)?.phoneNumber ?? ""
  const currentImage = user?.image ?? ""

  const [name, setName] = useState(currentName)
  const [imageUri, setImageUri] = useState(currentImage)
  const [imageMeta, setImageMeta] = useState<{ fileSize: number | null; mimeType: string | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [phoneStep, setPhoneStep] = useState<"input" | "otp" | "verified">(currentPhone ? "verified" : "input")
  const [otpCode, setOtpCode] = useState("")
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const insets = useSafeAreaInsets()

  const initialCountry = useMemo(() => {
    if (!currentPhone || !currentPhone.startsWith("+")) return { code: "MX" as CountryCode, calling: "52", number: "" }
    const rest = currentPhone.slice(1)
    if (rest.startsWith("52")) return { code: "MX" as CountryCode, calling: "52", number: rest.slice(2) }
    if (rest.startsWith("1")) return { code: "US" as CountryCode, calling: "1", number: rest.slice(1) }
    return { code: "MX" as CountryCode, calling: rest.slice(0, 2), number: rest.slice(2) }
  }, [currentPhone])

  const [countryCode, setCountryCode] = useState<CountryCode>(initialCountry.code)
  const [callingCode, setCallingCode] = useState(initialCountry.calling)
  const [phoneNumber, setPhoneNumber] = useState(initialCountry.number)
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [countryFilter, setCountryFilter] = useState("")
  const [allCountries, setAllCountries] = useState<Country[]>([])

  useEffect(() => { getAllCountries(FlagType.EMOJI, "common", undefined, undefined, PAISES_COMUNES).then(setAllCountries) }, [])

  useEffect(() => {
    if (phoneStep !== "otp") return
    const id = setInterval(() => {
      setResendCountdown((s) => (s > 1 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [phoneStep])

  const filteredCountries = useMemo(() => {
    if (!countryFilter) return allCountries
    const lower = countryFilter.toLowerCase()
    return allCountries.filter((c) => {
      const name = typeof c.name === "string" ? c.name : (c.name as any).common ?? ""
      return name.toLowerCase().includes(lower) || c.callingCode.some((cc) => cc.includes(countryFilter)) || c.cca2.toLowerCase().includes(lower)
    })
  }, [allCountries, countryFilter])

  const fullPhone = `+${callingCode}${phoneNumber}`

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      toast.error("Se necesita acceso a la galería")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
      setImageMeta({ fileSize: result.assets[0].fileSize ?? null, mimeType: result.assets[0].mimeType ?? null })
    }
  }

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Ingresa un número de teléfono")
      return
    }
    setSendingOtp(true)
    try {
      const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: fullPhone })
      if (error) {
        toast.error(getAuthErrorMessage(error, "No se pudo enviar el código"))
        return
      }
      setPhoneStep("otp")
      setResendCountdown(40)
      toast.success("Código enviado")
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "No se pudo enviar el código"))
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      toast.error("Ingresa el código de verificación")
      return
    }
    setVerifyingOtp(true)
    try {
      const { error } = await authClient.phoneNumber.verify({ phoneNumber: fullPhone, code: otpCode.trim(), updatePhoneNumber: true })
      if (error) {
        toast.error(getAuthErrorMessage(error, "Código incorrecto"))
        return
      }
      await refetchSession({ query: { disableCookieCache: true } })
      setPhoneStep("verified")
      setOtpCode("")
      toast.success("El número se vinculó correctamente")
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "Código incorrecto"))
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    setSaving(true)
    try {
      let avatarAssetId: string | undefined
      if (imageUri && imageUri !== currentImage) {
        const result = await uploadToCloudinary(imageUri, "ACCOUNT_AVATAR", imageMeta ?? undefined)
        avatarAssetId = result.mediaAssetId
      }
      await api.patch("/api/users/me", {
        name: name.trim(),
        ...(hasImageChanged ? { avatarAssetId: avatarAssetId ?? null } : {}),
      })
      await refetchSession({ query: { disableCookieCache: true } })
      toast.success("Perfil actualizado")
      router.back()
    } catch (e: any) {
      toast.error(e.message || "No se pudo actualizar el perfil")
    }
    setSaving(false)
  }

  const hasNameChanged = name.trim() !== currentName
  const hasImageChanged = imageUri !== currentImage
  const canSave = (hasNameChanged || hasImageChanged) && name.trim()

  const handleBack = useCallback(() => {
    if (hasNameChanged || hasImageChanged || phoneStep !== (currentPhone ? "verified" : "input")) {
      Alert.alert("Descartar cambios", "¿Seguro que quieres salir? Los cambios no guardados se perderán.", [
        { text: "Seguir editando", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }, [hasNameChanged, hasImageChanged, phoneStep, currentPhone])

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Editar cuenta" onBack={handleBack} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ gap: Gap.lg, padding: Pad.base, paddingBottom: 48 }}
      >
        <TouchableOpacity onPress={pickImage} style={{ alignItems: "center", gap: Gap.sm }}>
          <View style={{ width: 80, height: 80, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surface, borderWidth: 2, borderColor: Palette.cyan, alignItems: "center", justifyContent: "center" }}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: 80, height: 80 }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 32, color: Palette.cyan, fontWeight: "700" }}>{(currentName ?? "?").charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={{ color: Palette.cyan, fontSize: 13, fontWeight: "600" }}>Cambiar foto</Text>
        </TouchableOpacity>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Información de la cuenta</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary, marginBottom: 4 }}>Nombre *</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Tu nombre"
                placeholderTextColor={Palette.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={40}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: Palette.textSecondary, marginBottom: 4 }}>Teléfono</Text>
              {phoneStep === "verified" ? (
                <View style={{ gap: Gap.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.success, paddingHorizontal: Pad.base, paddingVertical: Pad.md }}>
                    <MaterialIcons name="check-circle" size={20} color={Palette.success} />
                    <Text style={{ flex: 1, fontSize: 15, color: Palette.text }}>{fullPhone}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setPhoneStep("input"); setOtpCode(""); setPhoneNumber("") }}>
                    <Text style={{ color: Palette.cyan, fontSize: 12 }}>Cambiar número</Text>
                  </TouchableOpacity>
                </View>
              ) : phoneStep === "input" ? (
                <View style={{ gap: Gap.sm }}>
                  <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => setCountryPickerOpen(true)}
                      style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, gap: Gap.sm }}
                    >
                      <Flag countryCode={countryCode} flagSize={24} />
                      <Text style={{ fontSize: 15, color: Palette.text, fontFamily: Fonts.semiBold }}>+{callingCode}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={{ flex: 1, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                      placeholder="555 123 4567"
                      placeholderTextColor={Palette.textMuted}
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={sendingOtp}
                    style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", opacity: sendingOtp ? 0.5 : 1 }}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator size="small" color={Palette.black} />
                    ) : (
                      <Text style={{ color: Palette.black, fontWeight: "700", fontSize: 15 }}>Enviar código</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: Gap.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                    <TextInput
                      style={{ flex: 1, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                      placeholder="Código de 6 dígitos"
                      placeholderTextColor={Palette.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                    />
                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      disabled={verifyingOtp}
                      style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, paddingHorizontal: Pad.lg, alignItems: "center", opacity: verifyingOtp ? 0.5 : 1 }}
                    >
                      {verifyingOtp ? (
                        <ActivityIndicator size="small" color={Palette.black} />
                      ) : (
                        <Text style={{ color: Palette.black, fontWeight: "700", fontSize: 15 }}>Verificar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => { setPhoneStep("input"); setOtpCode(""); setPhoneNumber("") }}>
                    <Text style={{ color: Palette.cyan, fontSize: 12 }}>Cambiar número</Text>
                  </TouchableOpacity>
                  {resendCountdown > 0 ? (
                    <Text style={{ color: Palette.textMuted, fontSize: 13, textAlign: "center" }}>
                      Reenviar código en {resendCountdown}s
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp}>
                      <Text style={{ color: Palette.cyan, fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                        Reenviar código
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: Gap.md }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flex: 1, paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, alignItems: "center" }}
          >
            <Text style={{ color: Palette.danger, fontWeight: "600", fontSize: 15 }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave || saving}
            style={{ flex: 1, paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center", opacity: (!canSave || saving) ? 0.5 : 1 }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Palette.black} />
            ) : (
              <Text style={{ color: Palette.black, fontWeight: "700", fontSize: 15 }}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <Modal visible={countryPickerOpen} transparent animationType="slide" onRequestClose={() => setCountryPickerOpen(false)}>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 32), backgroundColor: Palette.black }}>
          <CountryModalProvider>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
              <TouchableOpacity onPress={() => setCountryPickerOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="arrow-back" size={24} color={Palette.text} />
              </TouchableOpacity>
              <Text style={{ flex: 1, textAlign: "center", color: Palette.text, fontSize: 18, fontFamily: Fonts.semiBold }}>Seleccionar país</Text>
            </View>
            <CountryFilter
              onChangeText={setCountryFilter}
              autoFocus={true}
              placeholder="Buscar país..."
            />
            <CountryList
              data={filteredCountries}
              onSelect={(country) => {
                setCountryCode(country.cca2)
                setCallingCode(country.callingCode[0])
                setCountryPickerOpen(false)
                setCountryFilter("")
              }}
              withFlag={true}
              withEmoji={true}
              withCallingCode={true}
            />
          </CountryModalProvider>
        </View>
      </Modal>
    </View>
  )
}
