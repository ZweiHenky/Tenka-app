import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native"
import { router } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/infrastructure/auth/client"
import { userApi } from "@/features/users/api/users"
import { Palette, Radius, Pad, Gap } from "@/constants/theme"
import LoadingScreen from "@/shared/components/LoadingScreen"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { useToast } from "@/shared/components/Toast"
import { getAuthErrorMessage } from "@/infrastructure/auth/errors"
import { useNavGuard } from "@/shared/hooks/useNavGuard"
import { waitForIdle } from "@/shared/utils/wait-for-idle"
import type { League } from "@/domain/interfaces/league"

export default function ProfileScreen() {
  const guard = useNavGuard()
  const { data: session, isPending, refetch: refetchSession } = authClient.useSession()
  const user = session?.user
  const [savingPhoneVisibility, setSavingPhoneVisibility] = useState(false)
  const [phoneVisibleOverride, setPhoneVisibleOverride] = useState<boolean | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [activatingRole, setActivatingRole] = useState(false)
  const qc = useQueryClient()
  const toast = useToast()

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      router.replace("/(drawer)")
      await waitForIdle()

      const { error } = await authClient.signOut()
      if (error) {
        toast.error(getAuthErrorMessage(error, "No se pudo cerrar la sesión."))
        return
      }
      qc.clear()
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "No se pudo cerrar la sesión."))
    } finally {
      setSigningOut(false)
    }
  }, [qc, toast])

  const handleActivateLeagueRole = async () => {
    setActivatingRole(true)
    try {
      await userApi.activateLeagueRole()
      await refetchSession({ query: { disableCookieCache: true } })
      toast.success("Tu cuenta ya puede administrar ligas.")
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "No se pudo activar el rol de liga."))
    } finally {
      setActivatingRole(false)
    }
  }

  const handleUserUpdated = useCallback((showPhoneInPublicLeague: boolean) => {
    qc.setQueriesData<League>({
      queryKey: ["leagues"],
      predicate: (query) => query.queryKey.length === 2 && query.queryKey[1] !== "user",
    }, (league) => league?.user ? {
      ...league,
      user: { ...league.user, showPhoneInPublicLeague },
    } : league)
  }, [qc])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetchSession({ query: { disableCookieCache: true } })
    setRefreshing(false)
  }

  const handleTogglePhoneVisibility = useCallback(async () => {
    if (!user || !(user as any).phoneNumber) return
    const next = phoneVisibleOverride ?? !!((user as any).showPhoneInPublicLeague)
    const nextValue = !next
    setSavingPhoneVisibility(true)
    setPhoneVisibleOverride(nextValue)
    try {
      await userApi.updatePhoneVisibility(nextValue)
      await refetchSession({ query: { disableCookieCache: true } })
      handleUserUpdated(nextValue)
    } catch {
      setPhoneVisibleOverride(next)
    } finally {
      setSavingPhoneVisibility(false)
    }
  }, [handleUserUpdated, phoneVisibleOverride, refetchSession, user])

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Cuenta" />
        <LoadingScreen />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <Text style={{ fontSize: 16, color: Palette.textMuted, marginBottom: Gap.base }}>Sesión no encontrada</Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/sign-in")}
          style={{ backgroundColor: Palette.cyan, paddingVertical: Pad.md, paddingHorizontal: Pad.xl, borderRadius: Radius.md }}
        >
          <Text style={{ color: Palette.black, fontWeight: "600" }}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Cuenta" rightActions={[{ icon: "edit", onPress: () => guard(() => router.push("/(drawer)/account/edit")) }]} />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, gap: Gap.lg }}>
          <View style={{ alignItems: "center", gap: Gap.sm, marginBottom: Gap.base }}>
            <View style={{ width: 72, height: 72, borderRadius: Radius.full, backgroundColor: Palette.surface, borderWidth: 2, borderColor: Palette.cyan, alignItems: "center", justifyContent: "center" }}>
              {user.image ? (
                <View style={{ width: 72, height: 72, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surface }}>
                  <Image source={{ uri: user.image }} style={{ width: 72, height: 72 }} resizeMode="cover" />
                </View>
              ) : (
                <Text style={{ fontSize: 28, color: Palette.cyan, fontWeight: "700" }}>
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: Palette.text }}>{user.name}</Text>
          </View>

          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, gap: Gap.lg }}>
            <Section label="Correo electrónico" value={user.email} />
            <View style={{ height: 1, backgroundColor: Palette.border }} />
            <Section label="Rol" value={((user as any).rol ?? "—")} />
            <View style={{ height: 1, backgroundColor: Palette.border }} />
            <PhoneSection
              phone={(user as any).phoneNumber ?? ""}
              isPublic={phoneVisibleOverride ?? !!((user as any).showPhoneInPublicLeague)}
              isSaving={savingPhoneVisibility}
              onToggle={handleTogglePhoneVisibility}
            />
          </View>

          {(user as any).rol !== "LIGA" && (user as any).rol !== "ADMINISTRADOR" ? (
            <TouchableOpacity
              onPress={handleActivateLeagueRole}
              disabled={activatingRole}
              style={{ backgroundColor: Palette.cyan10, borderWidth: 1, borderColor: Palette.cyan, borderRadius: Radius.xl, paddingVertical: Pad.base, alignItems: "center", opacity: activatingRole ? 0.5 : 1 }}
            >
              {activatingRole ? <ActivityIndicator color={Palette.cyan} /> : <Text style={{ color: Palette.cyan, fontSize: 15, fontWeight: "700" }}>Activar administración de ligas</Text>}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            style={{ backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, borderRadius: Radius.xl, paddingVertical: Pad.base, alignItems: "center", marginTop: Gap.base, opacity: signingOut ? 0.5 : 1 }}
          >
            {signingOut ? <ActivityIndicator color={Palette.danger} /> : <Text style={{ color: Palette.danger, fontSize: 16, fontWeight: "600" }}>Cerrar sesión</Text>}
          </TouchableOpacity>
        </View>
      </PullToRefresh>
    </View>
  )
}

function PhoneSection({ phone, isPublic, isSaving, onToggle }: { phone: string; isPublic: boolean; isSaving: boolean; onToggle: () => void }) {
  const hasPhone = !!phone

  return (
    <View style={{ gap: Gap.sm }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
        Teléfono
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, color: hasPhone ? Palette.text : Palette.textMuted, fontWeight: hasPhone ? "500" : "400" }}>
            {hasPhone ? phone : "Todavía no existe uno"}
          </Text>
          {hasPhone ? (
            <Text style={{ fontSize: 12, color: Palette.textMuted, marginTop: Gap.micro }}>
              {isPublic ? "Visible en el detalle público de tus ligas." : "Oculto en el detalle público de tus ligas."}
            </Text>
          ) : null}
        </View>
        {hasPhone ? (
          <TouchableOpacity
            onPress={onToggle}
            disabled={isSaving}
            style={{ backgroundColor: isPublic ? Palette.danger10 : Palette.cyan10, borderWidth: 1, borderColor: isPublic ? Palette.danger : Palette.cyan, borderRadius: Radius.md, paddingHorizontal: Pad.md, paddingVertical: Pad.sm, minWidth: 118, alignItems: "center", opacity: isSaving ? 0.45 : 1 }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={isPublic ? Palette.danger : Palette.cyan} />
            ) : (
              <Text style={{ color: isPublic ? Palette.danger : Palette.cyan, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
                {isPublic ? "Ocultar" : "Mostrar"}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

function Section({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: Palette.textMuted, marginBottom: Gap.micro, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 16, color: muted ? Palette.textMuted : Palette.text, fontWeight: muted ? "400" : "500" }}>
        {value}
      </Text>
    </View>
  )
}
