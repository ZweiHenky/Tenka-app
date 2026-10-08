import { useState } from "react"
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { router } from "expo-router"
import { authClient } from "@/infrastructure/auth/client"
import {
  useBillingOperationalControl,
  useUpdateBillingOperationalControl,
} from "@/features/billing/hooks/useBilling"
import type { BillingOperationalMode } from "@/features/billing/types"
import type { UserRole } from "@/domain/interfaces/user"
import { Fonts, Gap, MaxContentWidth, Pad, Palette, Radius } from "@/constants/theme"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import CustomHeader from "@/shared/components/CustomHeader"
import EmptyState from "@/shared/components/EmptyState"
import ErrorState from "@/shared/components/ErrorState"
import LoadingScreen from "@/shared/components/LoadingScreen"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { useToast } from "@/shared/components/Toast"

function changedAtLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Fecha no disponible"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
  }
  return "No se pudo actualizar el control operacional."
}

export default function BillingOperationalControlScreen() {
  const toast = useToast()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const userId = session?.user?.id
  const role = (session?.user as { rol?: UserRole } | undefined)?.rol
  const isAdmin = role === "ADMINISTRADOR"
  const controlQuery = useBillingOperationalControl(userId, role, !sessionPending && isAdmin)
  const updateControl = useUpdateBillingOperationalControl(userId)
  const [reason, setReason] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const control = controlQuery.data
  const trimmedReason = reason.trim()
  const reasonValid = trimmedReason.length >= 10 && trimmedReason.length <= 500
  const targetMode: BillingOperationalMode = control?.mode === "ENABLED" ? "PURCHASES_PAUSED" : "ENABLED"
  const enabling = targetMode === "ENABLED"

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await controlQuery.refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const handleConfirm = async () => {
    if (!control || !reasonValid) return
    try {
      await updateControl.mutateAsync({
        mode: targetMode,
        reason: trimmedReason,
        expectedVersion: control.version,
      })
      setConfirming(false)
      setReason("")
      toast.success("Control operacional actualizado.")
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setConfirming(false)
        setReason("")
        await controlQuery.refetch()
      }
      toast.error(errorMessage(error))
    }
  }

  if (sessionPending) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Control de billing" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Control de billing" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="admin-panel-settings"
            message="Esta herramienta está disponible únicamente para administradores."
            actionLabel="Volver a Cuenta"
            onAction={() => router.back()}
          />
        </View>
      </View>
    )
  }

  if (controlQuery.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Control de billing" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (controlQuery.isError || !control) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Control de billing" onBack={() => router.back()} />
        <ErrorState
          fullScreen
          message="No se pudo consultar el control operacional."
          onRetry={() => controlQuery.refetch()}
        />
      </View>
    )
  }

  const modeEnabled = control.mode === "ENABLED"
  const statusColor = modeEnabled ? Palette.success : Palette.warning
  const statusBackground = modeEnabled ? Palette.success10 : Palette.warning10

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Control de billing" onBack={() => router.back()} />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh} keyboardAware>
        <View style={{ width: "100%", maxWidth: MaxContentWidth, alignSelf: "center", padding: Pad.xl, gap: Gap.lg }}>
          <View style={{ backgroundColor: Palette.warning10, borderColor: Palette.warning, borderWidth: 1, borderRadius: Radius.xl, padding: Pad.base, flexDirection: "row", gap: Gap.md }}>
            <MaterialIcons name="verified-user" size={24} color={Palette.warning} />
            <Text style={{ flex: 1, color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
              Estás operando el ambiente {control.environment}. El servidor registra cada cambio con tu identidad administrativa.
            </Text>
          </View>

          <View style={{ backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.xl, padding: Pad.lg, gap: Gap.base }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Gap.md }}>
              <View style={{ gap: Gap.micro }}>
                <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Estado actual</Text>
                <Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 20 }}>
                  {modeEnabled ? "Compras habilitadas" : "Compras pausadas"}
                </Text>
              </View>
              <View style={{ backgroundColor: statusBackground, borderColor: statusColor, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.sm }}>
                <Text style={{ color: statusColor, fontFamily: Fonts.semiBold, fontSize: 12 }}>{control.mode}</Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: Palette.border }} />
            <Detail label="Ambiente" value={control.environment} />
            <Detail label="Versión" value={String(control.version)} />
            <Detail label="Último cambio" value={changedAtLabel(control.changedAt)} />
            <View style={{ gap: Gap.micro }}>
              <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 12 }}>Motivo vigente</Text>
              <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 }}>{control.reason}</Text>
            </View>
          </View>

          <View style={{ backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.xl, padding: Pad.lg, gap: Gap.md }}>
            <View style={{ gap: Gap.micro }}>
              <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 16 }}>Motivo del cambio</Text>
              <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 }}>
                Describe por qué se {enabling ? "abre" : "pausa"} la operación. Este texto quedará auditado.
              </Text>
            </View>
            <TextInput
              value={reason}
              onChangeText={setReason}
              editable={!updateControl.isPending}
              multiline
              maxLength={500}
              placeholder={enabling ? "Ej. Prueba cerrada de compra sandbox en Google Play" : "Ej. Fin de la prueba cerrada de compra sandbox"}
              placeholderTextColor={Palette.textMuted}
              textAlignVertical="top"
              style={{
                minHeight: 112,
                backgroundColor: Palette.surfaceLight,
                borderColor: reason.length > 0 && !reasonValid ? Palette.warning : Palette.border,
                borderWidth: 1,
                borderRadius: Radius.lg,
                padding: Pad.base,
                color: Palette.text,
                fontFamily: Fonts.sans,
                fontSize: 15,
                lineHeight: 21,
              }}
            />
            <Text style={{ alignSelf: "flex-end", color: reasonValid ? Palette.textMuted : Palette.warning, fontFamily: Fonts.sans, fontSize: 12 }}>
              {trimmedReason.length}/500 · mínimo 10
            </Text>
          </View>

          <View style={{ backgroundColor: Palette.cyan10, borderColor: Palette.cyanDark, borderWidth: 1, borderRadius: Radius.xl, padding: Pad.base, flexDirection: "row", gap: Gap.md }}>
            <MaterialIcons name="info-outline" size={22} color={Palette.cyan} />
            <Text style={{ flex: 1, color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
              Habilitar este control no evita las demás protecciones: flags de Railway, RevenueCat, materialización y catálogo deben estar listos. Pausar bloquea nuevas compras, no revoca derechos ya verificados.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setConfirming(true)}
            disabled={!reasonValid || updateControl.isPending}
            activeOpacity={0.75}
            style={{
              minHeight: 52,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: enabling ? Palette.success : Palette.warning,
              backgroundColor: enabling ? Palette.success10 : Palette.warning10,
              alignItems: "center",
              justifyContent: "center",
              opacity: !reasonValid || updateControl.isPending ? 0.45 : 1,
            }}
          >
            {updateControl.isPending ? (
              <ActivityIndicator color={enabling ? Palette.success : Palette.warning} />
            ) : (
              <Text style={{ color: enabling ? Palette.success : Palette.warning, fontFamily: Fonts.semiBold, fontSize: 16 }}>
                {enabling ? "Habilitar compras" : "Pausar compras"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </PullToRefresh>

      <ConfirmationModal
        visible={confirming}
        title={enabling ? "Habilitar compras" : "Pausar compras"}
        message={enabling
          ? `Se habilitará el control operacional en ${control.environment}. Las demás protecciones del servidor seguirán aplicándose.`
          : `Se pausarán las compras nuevas en ${control.environment}. Las compras ya cobradas y sus derechos verificados se conservarán.`}
        confirmLabel={enabling ? "Habilitar" : "Pausar"}
        variant={enabling ? "default" : "warning"}
        loading={updateControl.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={handleConfirm}
      />
    </View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Gap.base }}>
      <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 12 }}>{label}</Text>
      <Text style={{ flex: 1, color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 14, textAlign: "right" }}>{value}</Text>
    </View>
  )
}
