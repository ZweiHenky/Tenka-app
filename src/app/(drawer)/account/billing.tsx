import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { router } from "expo-router"
import { authClient } from "@/infrastructure/auth/client"
import {
  useAbandonBillingCheckout,
  useAbandonBillingChangeOperation,
  useActiveBillingCheckout,
  useBillingCatalog,
  useBillingPurchaseSelection,
  useBillingState,
  usePreviewBillingChange,
  useSyncBillingCheckout,
  useSelectMigrationDivision,
} from "@/features/billing/hooks/useBilling"
import { useBillingOfferings } from "@/features/billing/hooks/useBillingOfferings"
import { useBillingDivisions } from "@/features/billing/hooks/useBillingDivisions"
import {
  GooglePlaySandboxPurchaseFlowError,
  useGooglePlaySandboxPurchase,
} from "@/features/billing/hooks/useGooglePlaySandboxPurchase"
import { useGooglePlayProductChange } from "@/features/billing/hooks/useGooglePlayProductChange"
import {
  canStartGooglePlaySandboxPurchase,
  canUseGooglePlaySandboxPurchases,
} from "@/features/billing/google-play-sandbox-policy"
import type { BillingChangePreview, BillingInterval, BillingOfferingPeriod } from "@/features/billing/types"
import {
  billingAccessLabel,
  billingChangeAbandonErrorNotice,
  billingChangeDirectionLabel,
  billingChangeIneligibleNotice,
  billingChangeOperationStatusLabel,
  billingChangeRequestErrorNotice,
  billingChangeTimingLabel,
  billingInitialPurchaseNotice,
  billingIntervalLabel,
  billingNextActionNotice,
  billingPeriodDisplay,
  billingStoreLabel,
  initialBillingCapacity,
  subscriptionManagementActionLabel,
  subscriptionManagementNotice,
} from "@/features/billing/utils/billing-display"
import { getApiErrorMetadata } from "@/infrastructure/api/errors"
import { Fonts, Gap, MaxContentWidth, Pad, Palette, Radius } from "@/constants/theme"
import CustomHeader from "@/shared/components/CustomHeader"
import EmptyState from "@/shared/components/EmptyState"
import ErrorState from "@/shared/components/ErrorState"
import LoadingScreen from "@/shared/components/LoadingScreen"
import PullToRefresh from "@/shared/components/PullToRefresh"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { useToast } from "@/shared/components/Toast"
import { env } from "@/infrastructure/config/env"

const CAPACITIES = Array.from({ length: 14 }, (_, index) => index + 2)
const CHANGE_INTERVALS: BillingInterval[] = ["MONTHLY", "QUARTERLY", "ANNUAL"]
type AvailableBillingPeriod = Extract<BillingOfferingPeriod, { status: "AVAILABLE" }>

export default function BillingScreen() {
  const toast = useToast()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const userId = session?.user?.id
  const stateQuery = useBillingState(userId, !sessionPending && !!userId)
  const billingState = stateQuery.data
  const role = billingState?.role
  const catalogQuery = useBillingCatalog(role, stateQuery.isSuccess)
  const catalog = catalogQuery.data
  const activeCheckoutQuery = useActiveBillingCheckout(userId, role, stateQuery.isSuccess)
  const activeCheckout = activeCheckoutQuery.data
  const selectionQuery = useBillingPurchaseSelection(userId, role, stateQuery.isSuccess)
  const divisionsQuery = useBillingDivisions(userId, role === "LIGA")
  const syncCheckout = useSyncBillingCheckout(userId)
  const abandonCheckout = useAbandonBillingCheckout(userId)
  const selectMigrationDivision = useSelectMigrationDivision(userId)
  const nativePlatform = Platform.OS === "ios" || Platform.OS === "android"
  const canLoadOfferings = role === "LIGA"
    && nativePlatform
    && !!billingState?.revenueCatAppUserId
    && catalogQuery.isSuccess
    && !!catalog?.available
    && !!catalog.release
  const offeringsQuery = useBillingOfferings({
    appUserId: billingState?.revenueCatAppUserId,
    catalog,
    role,
    enabled: canLoadOfferings,
  })
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingPurchase, setPendingPurchase] = useState<AvailableBillingPeriod | null>(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [confirmAbandonChangeId, setConfirmAbandonChangeId] = useState<string | null>(null)
  const [pendingChangeStep, setPendingChangeStep] = useState<"FIRST" | "FINAL" | null>(null)
  const [selectedDivisionOverride, setSelectedDivisionOverride] = useState<string[] | null>(null)
  const [changeCapacity, setChangeCapacity] = useState<number | null>(null)
  const [changeInterval, setChangeInterval] = useState<BillingInterval | null>(null)
  const [changePreview, setChangePreview] = useState<BillingChangePreview | null>(null)
  const previewChange = usePreviewBillingChange(userId)
  const abandonChange = useAbandonBillingChangeOperation(userId)

  const sandboxRuntimeEligible = canUseGooglePlaySandboxPurchases({
    appEnvironment: env.APP_ENV,
    platform: Platform.OS,
    catalogEnvironment: catalog?.environment,
    explicitlyEnabled: env.BILLING_GOOGLE_SANDBOX_PURCHASES,
    role,
    appUserId: billingState?.revenueCatAppUserId,
  })
  const sandboxPurchasesEnabled = canStartGooglePlaySandboxPurchase({
    runtimeEligible: sandboxRuntimeEligible,
    effectiveAccess: billingState?.effectiveAccess,
    billingStatePurchasesEnabled: billingState?.purchasesEnabled === true,
    catalogPurchasesEnabled: catalog?.purchasesEnabled === true,
    activeCheckoutRecovered: activeCheckoutQuery.isSuccess,
    activeCheckoutExists: !!activeCheckout,
    prerequisitesReady: selectionQuery.isSuccess && !divisionsQuery.isPending && !divisionsQuery.isError,
  })
  const sandboxPurchase = useGooglePlaySandboxPurchase({
    enabled: sandboxPurchasesEnabled,
    userId,
    appUserId: billingState?.revenueCatAppUserId,
    role,
    catalogEnvironment: catalog?.environment,
    releaseVersion: catalog?.release?.version,
  })
  const productChange = useGooglePlayProductChange({
    enabled: sandboxRuntimeEligible,
    userId,
    appUserId: billingState?.revenueCatAppUserId,
    role,
    catalogEnvironment: catalog?.environment,
    releaseVersion: catalog?.release?.version,
  })

  const activeCapacity = selectedCapacity
    ?? initialBillingCapacity(billingState?.effectiveCapacity ?? 0)
  const selectedOffering = offeringsQuery.data?.capacities
    .find(({ capacity }) => capacity === activeCapacity)
  const selectedDivisionIds = selectedDivisionOverride
    ?? selectionQuery.data?.items.filter((item) => !item.fixedByFreeGrant).map((item) => item.divisionId)
    ?? []
  const fixedDivisionId = billingState?.freeManagementGrant?.divisionId
  const editableCapacity = activeCapacity - (fixedDivisionId ? 1 : 0)
  const selectionFitsCapacity = selectedDivisionIds.length <= editableCapacity
  const activeChangeOperation = billingState?.activeChangeOperation
  const recoveredChangeAttemptId = activeChangeOperation?.activeAttempt?.id ?? null
  const syncedRecoveredAttemptRef = useRef<string | null>(null)
  useEffect(() => {
    if (!recoveredChangeAttemptId || syncedRecoveredAttemptRef.current === recoveredChangeAttemptId) return
    syncedRecoveredAttemptRef.current = recoveredChangeAttemptId
    void syncCheckout.mutateAsync(recoveredChangeAttemptId).catch(() => {
      if (syncedRecoveredAttemptRef.current === recoveredChangeAttemptId) {
        syncedRecoveredAttemptRef.current = null
      }
    })
  }, [recoveredChangeAttemptId, stateQuery.dataUpdatedAt, syncCheckout])
  const authoritativeChangeCapacity = activeChangeOperation?.target?.capacity
    ?? activeChangeOperation?.current?.capacity
    ?? null
  const authoritativeChangeInterval = activeChangeOperation?.target?.billingInterval
    ?? activeChangeOperation?.current?.billingInterval
    ?? null
  const availableChangeCapacities = offeringsQuery.data
    ? offeringsQuery.data.capacities
      .filter(({ periods }) => periods.some(({ status }) => status === "AVAILABLE"))
      .map(({ capacity }) => capacity)
    : CAPACITIES
  const resolvedChangeCapacity = changeCapacity
    ?? authoritativeChangeCapacity
    ?? (availableChangeCapacities.includes(billingState?.effectiveCapacity ?? 0)
      ? billingState?.effectiveCapacity ?? null
      : null)
  const availableChangeIntervals = offeringsQuery.data && resolvedChangeCapacity
    ? offeringsQuery.data.capacities
      .find(({ capacity }) => capacity === resolvedChangeCapacity)
      ?.periods.filter(({ status }) => status === "AVAILABLE")
      .map(({ billingInterval }) => billingInterval) ?? []
    : CHANGE_INTERVALS
  const resolvedChangeInterval = changeInterval ?? authoritativeChangeInterval
  const changeStore = billingState?.subscriptionManagement?.store ?? offeringsQuery.data?.store
  const canPreviewBillingChange = role === "LIGA"
    && billingState?.effectiveAccess === "PAID"
    && billingState?.purchasesEnabled === true
    && nativePlatform
    && !!offeringsQuery.data
    && offeringsQuery.data.store === changeStore
    && (changeStore === "GOOGLE" || changeStore === "APPLE")
  const hasActiveChangeOperation = !!activeChangeOperation
  const changeSelectorsDisabled = previewChange.isPending || hasActiveChangeOperation
  const canRequestChangePreview = canPreviewBillingChange
    && !changeSelectorsDisabled
    && resolvedChangeCapacity !== null
    && resolvedChangeInterval !== null
    && availableChangeIntervals.includes(resolvedChangeInterval)

  const displayedChange = activeChangeOperation
    ? {
      recovered: true,
      eligible: true,
      reason: null,
      operationId: activeChangeOperation.id ?? null,
      operationStatus: activeChangeOperation.status,
      current: activeChangeOperation.current ?? null,
      target: activeChangeOperation.target ?? null,
      firstStep: activeChangeOperation.firstStep ?? null,
      direction: activeChangeOperation.direction ?? null,
      timing: activeChangeOperation.timing ?? null,
      requiresRenewalSelection: activeChangeOperation.requiresRenewalSelection === true,
      operationVersion: activeChangeOperation.version,
      activeAttempt: activeChangeOperation.activeAttempt,
      lastErrorCode: activeChangeOperation.lastErrorCode,
    }
    : changePreview
      ? { ...changePreview, recovered: false, operationVersion: null, activeAttempt: null, lastErrorCode: null }
      : null
  const displayedTargetPeriod = displayedChange?.target
    ? offeringsQuery.data?.capacities
      .find(({ capacity }) => capacity === displayedChange.target?.capacity)
      ?.periods.find(({ billingInterval }) => billingInterval === displayedChange.target?.billingInterval)
    : null
  const displayedFirstStepPeriod = displayedChange?.firstStep
    ? offeringsQuery.data?.capacities
      .find(({ capacity }) => capacity === displayedChange.firstStep?.capacity)
      ?.periods.find(({ billingInterval }) => billingInterval === displayedChange.firstStep?.billingInterval)
    : null

  const toggleDivision = (divisionId: string) => {
    if (divisionId === fixedDivisionId) return
    if (selectedDivisionIds.includes(divisionId)) {
      setSelectedDivisionOverride(selectedDivisionIds.filter((id) => id !== divisionId))
      return
    }
    if (selectedDivisionIds.length >= editableCapacity) {
      toast.info(`Este plan admite ${activeCapacity} divisiones en total.`)
      return
    }
    setSelectedDivisionOverride([...selectedDivisionIds, divisionId])
  }

  const presentPurchaseOutcome = (outcome: Awaited<ReturnType<typeof sandboxPurchase.mutateAsync>>) => {
    if (outcome.status === "SDK_CONFIRMED") {
      toast.info("Compra recibida. El backend está verificando RevenueCat; no vuelvas a comprar.")
    } else if (outcome.status === "CANCELED") {
      toast.info("La compra fue cancelada y no se realizó ningún cargo.")
    } else if (outcome.status === "PENDING") {
      toast.info("El pago está pendiente. No vuelvas a comprar; se verificará cuando Google Play lo complete.")
    } else if (outcome.status === "ALREADY_PURCHASED") {
      toast.info("Google Play indica que este producto ya fue comprado. El backend verificará la compra existente.")
    } else if (outcome.status === "OWNERSHIP_CONFLICT") {
      toast.error("La compra pertenece a otra identidad de RevenueCat. No se transfirió acceso.")
    } else {
      toast.info("Google Play pudo completar la compra. No vuelvas a comprar; el backend conservará la verificación pendiente.")
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const refreshes: Promise<unknown>[] = [stateQuery.refetch()]
      if (role === "LIGA") refreshes.push(catalogQuery.refetch())
      if (canLoadOfferings) refreshes.push(offeringsQuery.refetch())
      if (role === "LIGA") refreshes.push(activeCheckoutQuery.refetch())
      if (role === "LIGA") refreshes.push(selectionQuery.refetch(), divisionsQuery.refetch())
      await Promise.allSettled(refreshes)
    } finally {
      setRefreshing(false)
    }
  }

  const handleSandboxPurchase = async () => {
    if (!pendingPurchase || !sandboxPurchasesEnabled) {
      setPendingPurchase(null)
      return
    }
    try {
      const outcome = await sandboxPurchase.mutateAsync({
        period: pendingPurchase,
        divisionIds: selectedDivisionIds,
      })
      presentPurchaseOutcome(outcome)
    } catch (error) {
      const code = error instanceof GooglePlaySandboxPurchaseFlowError ? error.code : "FAILED"
      if (code === "RETRYABLE") toast.error("No pudimos conectar con Google Play. Inténtalo nuevamente.")
      else if (code === "IN_PROGRESS") toast.info("Ya hay una compra sandbox en curso.")
      else if (code === "DISABLED") toast.error("Las compras sandbox no están habilitadas en esta build.")
      else toast.error("No pudimos completar la compra sandbox.")
    } finally {
      setPendingPurchase(null)
    }
  }

  const handleSyncCheckout = async () => {
    if (!activeCheckout) return
    try {
      const result = await syncCheckout.mutateAsync(activeCheckout.id)
      if (result.attempt?.status === "VERIFIED") {
        toast.success("Compra verificada. Tu estado de facturación fue actualizado.")
      } else if (result.status === "PENDING") {
        toast.info("La verificación sigue pendiente. No vuelvas a comprar.")
      } else {
        toast.info("La sincronización terminó y el estado de la compra fue actualizado.")
      }
    } catch {
      toast.error("No pudimos consultar la verificación. Inténtalo nuevamente.")
    }
  }

  const handleAbandonCheckout = async () => {
    if (!activeCheckout || activeCheckout.status !== "VERIFICATION_PENDING") return
    try {
      const result = await abandonCheckout.mutateAsync({
        attemptId: activeCheckout.id,
        expectedVersion: activeCheckout.version,
      })
      if (result.status === "ABANDONED") {
        toast.success("El intento sin compra fue liberado. Ya puedes preparar una prueba nueva.")
      } else if (result.status === "SYNCHRONIZED") {
        toast.info("La reconciliación encontró un estado final. Revisa tu acceso antes de volver a comprar.")
      } else if (result.reason === "settlement_window") {
        toast.info("Aún está dentro de la ventana de seguridad. Vuelve a intentarlo una hora después de iniciar la compra.")
      } else if (result.reason === "commercial_evidence") {
        toast.info("Hay evidencia comercial asociada. El intento no se liberó para evitar una compra duplicada.")
      } else {
        toast.info("RevenueCat todavía no permite confirmar que el intento esté vacío. Inténtalo más tarde.")
      }
    } catch {
      toast.error("No pudimos liberar el intento de forma segura. Actualiza el estado e inténtalo nuevamente.")
    } finally {
      setConfirmAbandon(false)
    }
  }

  const handleChangePreview = async () => {
    if (!canRequestChangePreview || !resolvedChangeCapacity || !resolvedChangeInterval) return
    try {
      const result = await previewChange.mutateAsync({
        logicalProductId: `tenka_capacity_${resolvedChangeCapacity}`,
        billingInterval: resolvedChangeInterval,
      })
      setChangePreview(result)
      if (!result.eligible) toast.info(billingChangeIneligibleNotice(result.reason))
      else toast.info("Vista previa calculada. No se realizó ni se programó ningún cambio.")
    } catch (error) {
      const { code } = getApiErrorMetadata(error)
      void stateQuery.refetch()
      toast.error(billingChangeRequestErrorNotice(code))
    }
  }

  const handleAbandonChange = async () => {
    if (activeChangeOperation?.status !== "SECOND_STEP_PENDING"
      || !activeChangeOperation.id || activeChangeOperation.activeAttempt) return
    try {
      await abandonChange.mutateAsync(activeChangeOperation.id)
      setChangePreview(null)
      toast.success("El segundo paso pendiente fue descartado.")
    } catch (error) {
      toast.error(billingChangeAbandonErrorNotice(getApiErrorMetadata(error).code))
    } finally {
      setConfirmAbandonChangeId(null)
    }
  }

  const handleProductChange = async () => {
    const step = pendingChangeStep
    if (!step) return
    try {
      const outcome = step === "FIRST"
        ? changePreview?.eligible && changePreview.current && changePreview.timing === "TWO_STEP"
          ? await productChange.mutateAsync({
            step: "FIRST",
            targetVariantId: changePreview.target.variantId,
            expectedSourceVariantId: changePreview.current.variantId,
            previewFingerprint: changePreview.previewFingerprint,
          })
          : null
        : activeChangeOperation?.status === "SECOND_STEP_PENDING"
          ? await productChange.mutateAsync({
            step: "FINAL",
            operationId: activeChangeOperation.id,
            expectedVersion: activeChangeOperation.version,
          })
          : null
      if (!outcome) return
      if (step === "FIRST") setChangePreview(null)
      presentPurchaseOutcome(outcome)
    } catch (error) {
      if (error instanceof GooglePlaySandboxPurchaseFlowError) {
        if (error.code === "IN_PROGRESS") toast.info("Ya hay un cambio de plan en curso.")
        else if (error.code === "DISABLED") toast.error("Los cambios sandbox no están habilitados en esta build.")
        else toast.error("No pudimos abrir Google Play. El servidor conservará el intento para verificarlo.")
      } else {
        const { code } = getApiErrorMetadata(error)
        if (code === "BILLING_CHANGE_PREVIEW_STALE" || code === "BILLING_CHANGE_CHANGED") {
          setChangePreview(null)
        }
        toast.error(billingChangeRequestErrorNotice(code))
      }
      void stateQuery.refetch()
    } finally {
      setPendingChangeStep(null)
    }
  }

  const handleOpenStoreSubscription = async () => {
    const management = billingState?.subscriptionManagement
    if (!management) return
    try {
      await Linking.openURL(management.url)
    } catch {
      toast.error("No pudimos abrir la gestión de tu suscripción en la tienda.")
    }
  }

  if (sessionPending || stateQuery.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Planes y facturación" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (stateQuery.isError || !billingState) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Planes y facturación" onBack={() => router.back()} />
        <ErrorState
          fullScreen
          message="No pudimos consultar el estado de tu cuenta."
          onRetry={() => void stateQuery.refetch()}
        />
      </View>
    )
  }

  const initialPurchaseNotice = billingInitialPurchaseNotice(
    billingState.effectiveAccess,
    billingState.effectiveCapacity,
  )

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Planes y facturación" onBack={() => router.back()} />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ width: "100%", maxWidth: MaxContentWidth, alignSelf: "center", padding: Pad.xl, gap: Gap.lg }}>
          <View
            style={{
              overflow: "hidden",
              backgroundColor: Palette.surface,
              borderRadius: Radius.xxl,
              borderWidth: 1,
              borderColor: Palette.border,
            }}
          >
            <View style={{ height: 4, backgroundColor: Palette.cyan }} />
            <View style={{ padding: Pad.xl, flexDirection: "row", alignItems: "center", gap: Gap.base }}>
              <View style={{ flex: 1, gap: Gap.sm }}>
                <Text accessibilityRole="header" style={{ color: Palette.textMuted, fontFamily: Fonts.semiBold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                  Estado de tu cuenta
                </Text>
                <Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 22 }}>
                  {billingAccessLabel(billingState.effectiveAccess)}
                </Text>
                <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 }}>
                  Tu acceso siempre se confirma con el servidor.
                </Text>
              </View>
              <View style={{ minWidth: 82, alignItems: "center", backgroundColor: Palette.cyan10, borderRadius: Radius.xl, padding: Pad.md }}>
                <Text style={{ color: Palette.cyan, fontFamily: Fonts.displayBold, fontSize: 30 }}>
                  {billingState.effectiveCapacity}
                </Text>
                <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 11, textAlign: "center" }}>
                  divisiones
                </Text>
              </View>
            </View>
          </View>

          {billingState.subscriptionManagement ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleOpenStoreSubscription()}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Gap.md,
                backgroundColor: Palette.surface,
                borderRadius: Radius.xl,
                borderWidth: 1,
                borderColor: Palette.border,
                padding: Pad.base,
              }}
            >
              <MaterialIcons name="open-in-new" size={22} color={Palette.cyan} />
              <View style={{ flex: 1, gap: Gap.micro }}>
                <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                  {subscriptionManagementActionLabel(billingState.subscriptionManagement.store)}
                </Text>
                <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  {subscriptionManagementNotice(
                    billingState.subscriptionManagement.store,
                    billingState.subscriptionManagement.willRenew,
                  )}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Palette.textMuted} />
            </Pressable>
          ) : null}

          {billingState.nextAction === "SCHEDULE_PERIOD_CHANGE" ? (
            <View style={{ flexDirection: "row", gap: Gap.md, backgroundColor: Palette.playoff10, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.playoff, padding: Pad.base }}>
              <MaterialIcons name="event-repeat" size={22} color={Palette.playoff} />
              <View style={{ flex: 1, gap: Gap.micro }}>
                <Text style={{ color: Palette.playoff, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                  Cambio de periodo pendiente
                </Text>
                <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  {billingNextActionNotice(billingState.nextAction)}
                </Text>
              </View>
            </View>
          ) : null}

          {role === "LIGA" && ((billingState.effectiveAccess === "PAID" && canPreviewBillingChange) || displayedChange) ? (
            <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
              <View style={{ gap: Gap.micro }}>
                <Text accessibilityRole="header" style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>
                  {activeChangeOperation ? "Cambio de plan recuperado" : "Vista previa del cambio de plan"}
                </Text>
                <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  {activeChangeOperation
                    ? "Este estado proviene del servidor y se conserva aunque cierres la aplicación."
                    : "El servidor calculará qué ocurriría con tu suscripción actual. Consultar esta vista previa no compra ni programa ningún cambio."}
                </Text>
              </View>

              {canPreviewBillingChange && !activeChangeOperation ? (
                <>
                  <View accessibilityLabel="Capacidad del nuevo plan">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Gap.sm }}>
                      {availableChangeCapacities.map((capacity) => {
                        const selected = capacity === resolvedChangeCapacity
                        return (
                          <Pressable
                            key={capacity}
                            accessibilityRole="button"
                            accessibilityLabel={`${capacity} divisiones`}
                            accessibilityState={{ selected, disabled: changeSelectorsDisabled }}
                            disabled={changeSelectorsDisabled}
                            onPress={() => {
                              setChangeCapacity(capacity)
                              setChangeInterval(null)
                              setChangePreview(null)
                            }}
                            style={{
                              minWidth: 52,
                              minHeight: 44,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: Radius.lg,
                              borderWidth: 1,
                              borderColor: selected ? Palette.cyan : Palette.border,
                              backgroundColor: selected ? Palette.cyan10 : Palette.surfaceLight,
                              opacity: changeSelectorsDisabled ? 0.5 : 1,
                            }}
                          >
                            <Text style={{ color: selected ? Palette.cyan : Palette.textSecondary, fontFamily: Fonts.displayBold, fontSize: 16 }}>
                              {capacity}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </ScrollView>
                  </View>

                  <View accessibilityLabel="Periodicidad del nuevo plan" style={{ gap: Gap.sm }}>
                    <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>
                      {resolvedChangeInterval ? "Periodicidad seleccionada" : "Elige una periodicidad para calcular la vista previa."}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Gap.sm }}>
                      {availableChangeIntervals.map((interval) => {
                        const selected = interval === resolvedChangeInterval
                        return (
                          <Pressable
                            key={interval}
                            accessibilityRole="button"
                            accessibilityState={{ selected, disabled: changeSelectorsDisabled }}
                            disabled={changeSelectorsDisabled}
                            onPress={() => {
                              setChangeInterval(interval)
                              setChangePreview(null)
                            }}
                            style={{
                              minHeight: 44,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: Radius.lg,
                              borderWidth: 1,
                              borderColor: selected ? Palette.cyan : Palette.border,
                              backgroundColor: selected ? Palette.cyan10 : Palette.surfaceLight,
                              paddingHorizontal: Pad.md,
                              opacity: changeSelectorsDisabled ? 0.5 : 1,
                            }}
                          >
                            <Text style={{ color: selected ? Palette.cyan : Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 13 }}>
                              {billingIntervalLabel(interval)}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </ScrollView>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={!canRequestChangePreview}
                    onPress={() => void handleChangePreview()}
                    style={{
                      alignSelf: "flex-start",
                      minHeight: 40,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: Gap.sm,
                      borderRadius: Radius.lg,
                      borderWidth: 1,
                      borderColor: Palette.cyan,
                      backgroundColor: Palette.cyan10,
                      paddingHorizontal: Pad.base,
                      opacity: canRequestChangePreview ? 1 : 0.5,
                    }}
                  >
                    {previewChange.isPending ? (
                      <ActivityIndicator size="small" color={Palette.cyan} />
                    ) : (
                      <MaterialIcons name="difference" size={17} color={Palette.cyan} />
                    )}
                    <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 13 }}>
                      Calcular vista previa
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {displayedChange ? (
                <View accessibilityLiveRegion="polite" style={{ gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.md }}>
                  <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                    {displayedChange.recovered
                      ? billingChangeOperationStatusLabel(displayedChange.operationStatus)
                      : displayedChange.eligible
                      ? `Vista previa: ${billingChangeDirectionLabel(displayedChange.direction).toLowerCase()}`
                      : "Cambio no disponible"}
                  </Text>
                  {displayedChange.eligible ? (
                    <>
                      {displayedChange.timing || (displayedChange.current && displayedChange.target) ? (
                        <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                          {displayedChange.recovered
                            ? billingChangeDirectionLabel(displayedChange.direction)
                            : billingChangeTimingLabel(displayedChange.timing)}
                          {displayedChange.current && displayedChange.target
                            ? ` · ${displayedChange.current.capacity} → ${displayedChange.target.capacity} divisiones`
                            : ""}
                        </Text>
                      ) : null}
                      {displayedChange.firstStep && displayedChange.target ? (
                        <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }}>
                          {displayedChange.operationStatus === "SECOND_STEP_PENDING"
                            ? `Google Play ya confirmó el primer paso de ${displayedChange.firstStep.capacity} divisiones. Falta resolver el cambio a ${displayedChange.target.capacity} divisiones ${billingIntervalLabel(displayedChange.target.billingInterval)}.`
                            : `Primero se contratarían ${displayedChange.firstStep.capacity} divisiones ${billingIntervalLabel(displayedChange.firstStep.billingInterval)} y, solo después de la confirmación de Google Play, se agendarían ${displayedChange.target.capacity} divisiones ${billingIntervalLabel(displayedChange.target.billingInterval)}.`}
                        </Text>
                      ) : null}
                      {displayedTargetPeriod?.status === "AVAILABLE" ? (
                        <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 13 }}>
                          Precio recurrente objetivo: {displayedTargetPeriod.priceString}
                        </Text>
                      ) : null}
                      {displayedChange.recovered
                        && billingState.nextAction !== "SCHEDULE_PERIOD_CHANGE"
                        && billingNextActionNotice(billingState.nextAction) ? (
                        <Text style={{ color: Palette.warning, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }}>
                          {billingNextActionNotice(billingState.nextAction)}
                        </Text>
                      ) : null}
                      {displayedChange.lastErrorCode === "canonical_unsafe_ownership" ? (
                        <Text style={{ color: Palette.danger, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }}>
                          RevenueCat detectó un conflicto de propiedad. No vuelvas a programar el cambio; conserva el plan intermedio y contacta soporte.
                        </Text>
                      ) : null}
                      {displayedChange.requiresRenewalSelection ? (
                        <Text style={{ color: Palette.warning, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }}>
                          El plan propuesto admitiría menos divisiones asignadas. Antes de ejecutarlo tendrías que elegir cuáles conservar.
                        </Text>
                      ) : null}
                      {!displayedChange.recovered && displayedChange.timing !== "TWO_STEP" ? (
                        <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }}>
                          Esta vista previa es informativa. La ejecución desde la aplicación se habilitará después para este tipo de cambio.
                        </Text>
                      ) : null}
                      {!displayedChange.recovered
                        && displayedChange.timing === "TWO_STEP"
                        && displayedChange.current
                        && displayedChange.target
                        && canPreviewBillingChange
                        && sandboxRuntimeEligible ? (
                        <Pressable
                          accessibilityRole="button"
                          disabled={productChange.isPending}
                          onPress={() => setPendingChangeStep("FIRST")}
                          style={{
                            alignSelf: "flex-start",
                            minHeight: 40,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: Gap.sm,
                            borderRadius: Radius.lg,
                            backgroundColor: Palette.cyan,
                            paddingHorizontal: Pad.base,
                            opacity: productChange.isPending ? 0.5 : 1,
                          }}
                        >
                          {productChange.isPending ? <ActivityIndicator size="small" color={Palette.black} /> : null}
                          <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 13 }}>
                            Continuar con el cambio
                          </Text>
                        </Pressable>
                      ) : null}
                      {displayedChange.recovered
                        && displayedChange.operationStatus === "SECOND_STEP_PENDING"
                        && displayedChange.operationId
                        && !displayedChange.activeAttempt
                        && billingState.nextAction === "SCHEDULE_PERIOD_CHANGE"
                        && sandboxRuntimeEligible ? (
                        <Pressable
                          accessibilityRole="button"
                          disabled={productChange.isPending}
                          onPress={() => setPendingChangeStep("FINAL")}
                          style={{
                            alignSelf: "flex-start",
                            minHeight: 40,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: Gap.sm,
                            borderRadius: Radius.lg,
                            backgroundColor: Palette.playoff,
                            paddingHorizontal: Pad.base,
                            opacity: productChange.isPending ? 0.5 : 1,
                          }}
                        >
                          {productChange.isPending ? <ActivityIndicator size="small" color={Palette.black} /> : null}
                          <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 13 }}>
                            Programar en Google Play
                          </Text>
                        </Pressable>
                      ) : null}
                      {displayedChange.recovered
                        && displayedChange.operationStatus === "SECOND_STEP_PENDING"
                        && displayedChange.operationId
                        && !displayedChange.activeAttempt ? (
                        <Pressable
                          accessibilityRole="button"
                          disabled={abandonChange.isPending}
                          onPress={() => setConfirmAbandonChangeId(displayedChange.operationId)}
                          style={{
                            alignSelf: "flex-start",
                            minHeight: 36,
                            justifyContent: "center",
                            borderRadius: Radius.lg,
                            borderWidth: 1,
                            borderColor: Palette.danger,
                            paddingHorizontal: Pad.md,
                            opacity: abandonChange.isPending ? 0.5 : 1,
                          }}
                        >
                          <Text style={{ color: Palette.danger, fontFamily: Fonts.semiBold, fontSize: 12 }}>
                            Descartar cambio
                          </Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : (
                    <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                      {billingChangeIneligibleNotice(displayedChange.reason)}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          {billingState.freeManagementGrant ? (
            <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.micro }}>
              <Text style={{ color: Palette.textMuted, fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
                División gratuita protegida
              </Text>
              <Text style={{ color: Palette.text, fontFamily: Fonts.medium, fontSize: 15 }}>
                {billingState.freeManagementGrant.divisionName}
              </Text>
              <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13 }}>
                {billingState.freeManagementGrant.leagueName}
              </Text>
            </View>
          ) : null}

          {billingState.migrationOverlayActive ? (
            <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.cyan, padding: Pad.base, gap: Gap.md }}>
              <View style={{ gap: Gap.micro }}>
                <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                  Elige tu división gratuita
                </Text>
                <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  {billingState.migrationPaused
                    ? "El plazo está pausado. Conservas acceso mientras resolvemos la operación."
                    : `Tu acceso de transición termina el ${billingState.migrationDeadline ? new Date(billingState.migrationDeadline).toLocaleDateString() : "plazo indicado"}.`}
                </Text>
              </View>
              {(billingState.migrationDivisions ?? []).map((division) => {
                const selected = billingState.migrationSelectedDivisionId === division.id
                return (
                  <Pressable
                    key={division.id}
                    accessibilityRole="button"
                    disabled={!!billingState.migrationSelectedDivisionId || selectMigrationDivision.isPending}
                    onPress={async () => {
                      try {
                        await selectMigrationDivision.mutateAsync(division.id)
                        toast.success("División gratuita protegida.")
                      } catch {
                        toast.error("No pudimos guardar la selección.")
                      }
                    }}
                    style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: selected ? Palette.success : Palette.border, padding: Pad.md, opacity: billingState.migrationSelectedDivisionId && !selected ? 0.5 : 1 }}
                  >
                    <MaterialIcons name={selected ? "check-circle" : "radio-button-unchecked"} size={21} color={selected ? Palette.success : Palette.cyan} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Palette.text, fontFamily: Fonts.medium, fontSize: 14 }}>{division.name}</Text>
                      <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>{division.leagueName}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          ) : null}

          {activeCheckout ? (
            <View style={{ backgroundColor: Palette.warning10, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.warning, padding: Pad.base, gap: Gap.sm }}>
              <Text style={{ color: Palette.warning, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                Compra en verificación
              </Text>
              <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                Estado: {activeCheckout.status}. No inicies otra compra mientras el backend confirma Google Play.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={syncCheckout.isPending}
                onPress={() => void handleSyncCheckout()}
                style={{ alignSelf: "flex-start", minHeight: 38, justifyContent: "center", borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.warning, paddingHorizontal: Pad.md, opacity: syncCheckout.isPending ? 0.5 : 1 }}
              >
                <Text style={{ color: Palette.warning, fontFamily: Fonts.semiBold, fontSize: 12 }}>
                  {syncCheckout.isPending ? "Verificando…" : "Verificar ahora"}
                </Text>
              </Pressable>
              {activeCheckout.status === "VERIFICATION_PENDING" && env.APP_ENV === "preview" ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={abandonCheckout.isPending || syncCheckout.isPending}
                  onPress={() => setConfirmAbandon(true)}
                  style={{ alignSelf: "flex-start", minHeight: 38, justifyContent: "center", borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.danger, paddingHorizontal: Pad.md, opacity: abandonCheckout.isPending || syncCheckout.isPending ? 0.5 : 1 }}
                >
                  <Text style={{ color: Palette.danger, fontFamily: Fonts.semiBold, fontSize: 12 }}>
                    Liberar intento sin compra
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: Gap.md, backgroundColor: Palette.warning10, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.warning, padding: Pad.base }}>
            <MaterialIcons name={sandboxPurchasesEnabled ? "science" : "visibility"} size={22} color={Palette.warning} />
            <View style={{ flex: 1, gap: Gap.micro }}>
              <Text style={{ color: Palette.warning, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                 {sandboxPurchasesEnabled
                   ? "Sandbox de Google Play"
                   : canPreviewBillingChange
                     ? "Gestión de suscripción"
                   : initialPurchaseNotice
                     ? "Plan actual"
                     : "Solo consulta"}
              </Text>
              <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                 {sandboxPurchasesEnabled
                   ? "Solo para pruebas sandbox. Una compra aquí no activa acceso pagado hasta reconciliar el backend."
                   : canPreviewBillingChange
                     ? "Puedes calcular una vista previa del cambio. No se realizará ni programará nada desde esta pantalla."
                   : initialPurchaseNotice
                     ? initialPurchaseNotice
                  : sandboxRuntimeEligible
                    ? "El backend mantiene las compras pausadas. Aquí puedes consultar los planes sin iniciar Google Play."
                    : "Las compras todavía no están disponibles. Aquí puedes consultar los planes y precios ofrecidos por tu tienda."}
              </Text>
            </View>
          </View>

          {role === "CAPITAN" ? (
            <EmptyState
              icon="sports-soccer"
              message="Primero activa la administración de ligas desde Cuenta para consultar planes de capacidad."
            />
          ) : role === "ADMINISTRADOR" ? (
            <EmptyState
              icon="admin-panel-settings"
              message="Tu cuenta tiene acceso administrativo y no necesita consultar planes de tienda."
            />
          ) : !nativePlatform ? (
            <EmptyState
              icon="phone-iphone"
              message="Los precios de App Store y Google Play están disponibles desde iOS o Android."
            />
          ) : catalogQuery.isPending ? (
            <View style={{ paddingVertical: Pad.xxl, alignItems: "center", gap: Gap.md }}>
              <ActivityIndicator color={Palette.cyan} />
              <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans }}>Consultando catálogo…</Text>
            </View>
          ) : catalogQuery.isError ? (
            <ErrorState
              message="No pudimos consultar el catálogo de planes."
              onRetry={() => void catalogQuery.refetch()}
            />
          ) : !catalog?.available || !catalog.release ? (
            <EmptyState
              icon="inventory-2"
              message="El catálogo de planes todavía no está disponible en este ambiente."
            />
          ) : !billingState.revenueCatAppUserId ? (
            <EmptyState
              icon="sync-problem"
              message="Los precios están temporalmente indisponibles mientras preparamos tu cuenta de facturación."
            />
          ) : offeringsQuery.isPending ? (
            <View style={{ paddingVertical: Pad.xxl, alignItems: "center", gap: Gap.md }}>
              <ActivityIndicator color={Palette.cyan} />
              <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans }}>Consultando precios de tu tienda…</Text>
            </View>
          ) : offeringsQuery.isError ? (
            <ErrorState
              message="No pudimos consultar los precios de tu tienda."
              onRetry={() => void offeringsQuery.refetch()}
            />
          ) : offeringsQuery.data ? (
            <View style={{ gap: Gap.base }}>
              <View style={{ gap: Gap.micro }}>
                <Text accessibilityRole="header" style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 20 }}>
                  Consulta por capacidad
                </Text>
                <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  {billingStoreLabel(offeringsQuery.data.store)} · {offeringsQuery.data.availableVariantCount} de 42 precios disponibles
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Gap.sm }}
                accessibilityLabel="Capacidad de divisiones a consultar"
              >
                {CAPACITIES.map((capacity) => {
                  const selected = capacity === activeCapacity
                  return (
                    <Pressable
                      key={capacity}
                      onPress={() => setSelectedCapacity(capacity)}
                      accessibilityRole="button"
                      accessibilityLabel={`${capacity} divisiones`}
                      accessibilityState={{ selected }}
                      style={{
                        minWidth: 52,
                        minHeight: 48,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: Radius.lg,
                        borderWidth: 1,
                        borderColor: selected ? Palette.cyan : Palette.border,
                        backgroundColor: selected ? Palette.cyan10 : Palette.surface,
                      }}
                    >
                      <Text style={{ color: selected ? Palette.cyan : Palette.textSecondary, fontFamily: Fonts.displayBold, fontSize: 17 }}>
                        {capacity}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              <View style={{ gap: Gap.sm }}>
                <View style={{ gap: Gap.micro }}>
                  <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>
                    Divisiones del periodo
                  </Text>
                  <Text style={{ color: selectionFitsCapacity ? Palette.textMuted : Palette.danger, fontFamily: Fonts.sans, fontSize: 12 }}>
                    {selectedDivisionIds.length + (fixedDivisionId ? 1 : 0)} de {activeCapacity} seleccionadas
                  </Text>
                </View>
                {divisionsQuery.isPending ? (
                  <ActivityIndicator color={Palette.cyan} />
                ) : divisionsQuery.isError ? (
                  <Text style={{ color: Palette.danger, fontFamily: Fonts.sans, fontSize: 13 }}>
                    No pudimos cargar tus divisiones.
                  </Text>
                ) : divisionsQuery.data.length === 0 ? (
                  <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 13 }}>
                    Crea una división antes de preparar una compra.
                  </Text>
                ) : divisionsQuery.data.map((division) => {
                  const fixed = division.id === fixedDivisionId
                  const selected = fixed || selectedDivisionIds.includes(division.id)
                  return (
                    <Pressable
                      key={division.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled: fixed }}
                      disabled={fixed}
                      onPress={() => toggleDivision(division.id)}
                      style={{
                        minHeight: 56,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: Gap.md,
                        borderRadius: Radius.lg,
                        borderWidth: 1,
                        borderColor: selected ? Palette.cyan : Palette.border,
                        backgroundColor: selected ? Palette.cyan10 : Palette.surface,
                        padding: Pad.md,
                      }}
                    >
                      <MaterialIcons
                        name={selected ? "check-box" : "check-box-outline-blank"}
                        size={22}
                        color={selected ? Palette.cyan : Palette.textMuted}
                      />
                      <View style={{ flex: 1, gap: Gap.micro }}>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.medium, fontSize: 14 }}>
                          {division.nombre}
                        </Text>
                        <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>
                          {division.ligaNombre}{fixed ? " · Slot gratuito fijo" : ""}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>

              <View style={{ gap: Gap.md }} accessibilityLiveRegion="polite">
                {selectedOffering?.periods.map((period) => {
                  const display = billingPeriodDisplay(period)
                  return (
                    <View
                      key={period.billingInterval}
                      style={{
                        minHeight: 88,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: Gap.md,
                        backgroundColor: Palette.surface,
                        borderRadius: Radius.xl,
                        borderWidth: 1,
                        borderColor: display.available ? Palette.border : Palette.warning,
                        padding: Pad.base,
                      }}
                    >
                      <View style={{ flex: 1, gap: Gap.micro }}>
                        <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 16 }}>
                          {display.label}
                        </Text>
                        <Text style={{ color: display.available ? Palette.success : Palette.warning, fontFamily: Fonts.medium, fontSize: 12 }}>
                          {display.available ? "Disponible" : "No disponible"}
                        </Text>
                      </View>
                      {display.available ? (
                        <View style={{ alignItems: "flex-end", gap: Gap.sm }}>
                          <Text style={{ color: Palette.cyanBright, fontFamily: Fonts.displayBold, fontSize: 22, textAlign: "right" }}>
                            {display.priceString}
                          </Text>
                          <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 11 }}>
                            {display.currencyCode}
                          </Text>
                          {sandboxPurchasesEnabled ? (
                            <Pressable
                              onPress={() => {
                                if (period.status === "AVAILABLE") setPendingPurchase(period)
                              }}
                              disabled={sandboxPurchase.isPending || !selectionFitsCapacity}
                              accessibilityRole="button"
                              accessibilityLabel={`Comprar ${display.label} en sandbox`}
                              style={{
                                minHeight: 38,
                                minWidth: 142,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: Gap.sm,
                                borderRadius: Radius.lg,
                                borderWidth: 1,
                                borderColor: Palette.cyan,
                                backgroundColor: Palette.cyan10,
                                paddingHorizontal: Pad.md,
                                opacity: sandboxPurchase.isPending || !selectionFitsCapacity ? 0.5 : 1,
                              }}
                            >
                              {sandboxPurchase.isPending && pendingPurchase?.productIdentifier === period.productIdentifier ? (
                                <ActivityIndicator size="small" color={Palette.cyan} />
                              ) : (
                                <MaterialIcons name="shopping-cart" size={17} color={Palette.cyan} />
                              )}
                              <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 12 }}>
                                Comprar en sandbox
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : (
                        <MaterialIcons name="remove-circle-outline" size={24} color={Palette.warning} />
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          ) : null}
        </View>
      </PullToRefresh>
      <ConfirmationModal
        visible={pendingPurchase !== null && sandboxPurchasesEnabled}
        title="Confirmar compra sandbox"
        message={pendingPurchase
          ? `El backend bloqueará ${selectedDivisionIds.length + (fixedDivisionId ? 1 : 0)} divisiones para un plan con capacidad de ${pendingPurchase.capacity}, ${billingPeriodDisplay(pendingPurchase).label.toLowerCase()}, por ${pendingPurchase.priceString}. El acceso solo cambia después de verificar RevenueCat.`
          : ""}
        highlightText={pendingPurchase?.priceString}
        confirmLabel="Abrir Google Play"
        variant="warning"
        loading={sandboxPurchase.isPending}
        onClose={() => setPendingPurchase(null)}
        onConfirm={() => void handleSandboxPurchase()}
      />
      <ConfirmationModal
        visible={pendingChangeStep !== null}
        title={pendingChangeStep === "FINAL" ? "Programar segundo paso" : "Confirmar primer paso"}
        message={pendingChangeStep === "FINAL"
          ? `Google Play programará ${displayedChange?.target?.capacity ?? "el nuevo plan"} divisiones con periodicidad ${displayedChange?.target ? billingIntervalLabel(displayedChange.target.billingInterval).toLowerCase() : "seleccionada"} para la renovación. El primer aumento ya verificado no se repetirá.`
          : `Google Play abrirá el primer paso para aumentar la capacidad a ${displayedChange?.firstStep?.capacity ?? "la seleccionada"} divisiones, conservando la periodicidad actual${displayedFirstStepPeriod?.status === "AVAILABLE" ? ` por ${displayedFirstStepPeriod.priceString}` : ""}. Google determina cualquier ajuste prorrateado. El segundo paso requerirá otra confirmación después de la verificación del servidor.`}
        highlightText={pendingChangeStep === "FINAL"
          ? displayedTargetPeriod?.status === "AVAILABLE" ? displayedTargetPeriod.priceString : undefined
          : displayedFirstStepPeriod?.status === "AVAILABLE" ? displayedFirstStepPeriod.priceString : undefined}
        confirmLabel={pendingChangeStep === "FINAL" ? "Programar en Google Play" : "Abrir Google Play - paso 1"}
        variant="warning"
        loading={productChange.isPending}
        onClose={() => setPendingChangeStep(null)}
        onConfirm={() => void handleProductChange()}
      />
      <ConfirmationModal
        visible={confirmAbandon}
        title="Liberar intento sin compra"
        message="El servidor volverá a consultar RevenueCat y solo liberará el intento si pasó la ventana de seguridad y no existe evidencia de compra. No continúes si viste un cobro o una confirmación de Google Play."
        confirmLabel="Revisar y liberar"
        variant="danger"
        loading={abandonCheckout.isPending}
        onClose={() => setConfirmAbandon(false)}
        onConfirm={() => void handleAbandonCheckout()}
      />
      <ConfirmationModal
        visible={confirmAbandonChangeId === activeChangeOperation?.id
          && activeChangeOperation?.status === "SECOND_STEP_PENDING"
          && !activeChangeOperation.activeAttempt}
        title="Descartar segundo paso"
        message="El primer paso ya fue confirmado. Solo se descartará el segundo cambio pendiente; conservarás la capacidad y periodicidad intermedias actuales."
        confirmLabel="Descartar segundo paso"
        variant="danger"
        loading={abandonChange.isPending}
        onClose={() => setConfirmAbandonChangeId(null)}
        onConfirm={() => void handleAbandonChange()}
      />
    </View>
  )
}
