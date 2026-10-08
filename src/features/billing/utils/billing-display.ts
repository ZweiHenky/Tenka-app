import type {
  BillingChangeDirection,
  BillingChangeOperationStatus,
  BillingChangePreviewReason,
  BillingChangeTiming,
  BillingInterval,
  BillingNextAction,
  BillingOfferingPeriod,
  BillingStore,
  EffectiveBillingAccess,
} from "@/features/billing/types"

const ACCESS_LABELS: Record<EffectiveBillingAccess, string> = {
  FREE: "Plan gratuito",
  PAID: "Suscripción activa",
  LOCAL_GRACE: "Periodo de gracia",
  MIGRATION: "Acceso de transición",
  ENTERPRISE: "Enterprise",
  ADMIN: "Acceso de administrador",
}

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  ANNUAL: "Anual",
}

export function billingAccessLabel(access: EffectiveBillingAccess) {
  return ACCESS_LABELS[access]
}

export function billingInitialPurchaseNotice(access: EffectiveBillingAccess, capacity: number) {
  if (access === "PAID") {
    return `Tu suscripción activa incluye capacidad para ${capacity} divisiones. Puedes consultar otros planes y precios, pero los cambios de plan aún no están disponibles.`
  }
  if (access === "LOCAL_GRACE") {
    return `Conservas temporalmente acceso para ${capacity} divisiones durante el periodo de gracia. Puedes consultar los planes y precios, pero no iniciar otra compra desde aquí.`
  }
  return null
}

export function billingIntervalLabel(interval: BillingInterval) {
  return INTERVAL_LABELS[interval]
}

export function billingStoreLabel(store: BillingStore) {
  return store === "APPLE" ? "App Store" : "Google Play"
}

export function subscriptionManagementActionLabel(store: BillingStore) {
  return `Gestionar en ${billingStoreLabel(store)}`
}

export function subscriptionManagementNotice(
  store: BillingStore,
  willRenew: boolean | null | undefined,
) {
  const storeLabel = billingStoreLabel(store)
  if (willRenew === false) {
    return `Tu suscripción en ${storeLabel} está cancelada y termina al cerrar el periodo actual. Puedes reactivarla desde tu tienda.`
  }
  return `Cancela, pausa o cambia tu suscripción directamente en ${storeLabel}. El acceso se actualiza cuando la tienda lo confirma.`
}

export function billingNextActionNotice(nextAction: BillingNextAction | null | undefined) {
  if (nextAction === "SCHEDULE_PERIOD_CHANGE") {
    return "Google Play ya confirmó el aumento de capacidad. El cambio de periodo todavía no está programado; puedes conservar el plan intermedio o descartar este segundo paso."
  }
  if (nextAction === "WAIT_FOR_FIRST_VERIFICATION") {
    return "El primer paso está pendiente de verificación. No vuelvas a abrir Google Play; el servidor seguirá consultando RevenueCat."
  }
  if (nextAction === "WAIT_FOR_SCHEDULE_VERIFICATION") {
    return "La programación está pendiente de confirmación canónica. No repitas el cambio mientras el servidor verifica RevenueCat."
  }
  if (nextAction === "PURCHASE_FIRST_STEP") return "El cambio está preparado para iniciar el primer paso."
  return null
}

export function billingChangeDirectionLabel(direction: BillingChangeDirection | null) {
  if (direction === "UPGRADE") return "Cambio a un plan superior"
  if (direction === "DOWNGRADE") return "Cambio a un plan inferior"
  return "Cambio de periodicidad"
}

export function billingChangeTimingLabel(timing: BillingChangeTiming | null) {
  if (timing === "IMMEDIATE") return "Se aplicaría de inmediato"
  if (timing === "TWO_STEP") return "Se aplicaría en dos pasos"
  if (timing === "DEFERRED") return "Se aplicaría en la siguiente renovación"
  return "Sin cambios"
}

export function billingChangeOperationStatusLabel(status: BillingChangeOperationStatus | null | undefined) {
  switch (status) {
    case "SECOND_STEP_PENDING":
      return "Segundo paso pendiente"
    case "SCHEDULED":
      return "Cambio programado por la tienda"
    case "COMPLETED":
      return "Cambio completado"
    case "CANCELED":
      return "Cambio cancelado"
    case "ABANDONED":
      return "Cambio descartado"
    default:
      return "Operación de cambio en curso"
  }
}

export function billingChangeRequestErrorNotice(code: string | undefined) {
  switch (code) {
    case "BILLING_CHANGE_IN_PROGRESS":
      return "Ya hay un cambio de plan en curso. Actualiza esta pantalla para consultar su estado antes de intentar otra opción."
    case "BILLING_PURCHASES_PAUSED":
      return "Los cambios de plan están pausados temporalmente. Tu suscripción actual no cambió."
    case "BILLING_CATALOG_UNAVAILABLE":
      return "El catálogo de planes no está disponible en este momento. Tu suscripción actual no cambió."
    case "BILLING_CHANGE_VARIANT_UNAVAILABLE":
      return "Esa variante no está disponible en el catálogo vigente. Elige otra opción disponible."
    case "BILLING_CHANGE_CHANGED":
    case "BILLING_CHANGE_OPERATION_CHANGED":
      return "El estado del cambio se actualizó. Recarga la pantalla antes de continuar."
    case "BILLING_CHANGE_PREVIEW_STALE":
      return "La suscripción o el catálogo cambiaron. Calcula una nueva vista previa antes de confirmar."
    case "BILLING_CHANGE_UNSUPPORTED":
      return "Este tipo de cambio todavía no puede ejecutarse desde la aplicación. Tu suscripción actual no cambió."
    default:
      return "No pudimos calcular la vista previa. Tu suscripción actual no cambió."
  }
}

export function billingChangeAbandonErrorNotice(code: string | undefined) {
  switch (code) {
    case "BILLING_CHANGE_OPERATION_NOT_ABANDONABLE":
      return "El segundo paso ya cambió de estado y no puede descartarse. Actualiza la pantalla para consultar su estado."
    case "BILLING_CHANGE_OPERATION_CHANGED":
    case "BILLING_CHANGE_CHANGED":
      return "El estado del cambio se actualizó. Recarga la pantalla antes de continuar."
    default:
      return "No pudimos descartar el segundo paso de forma segura. Actualiza la pantalla para consultar su estado."
  }
}

export function billingChangeIneligibleNotice(reason: BillingChangePreviewReason | null) {
  switch (reason) {
    case "NO_ACTIVE_SUBSCRIPTION":
      return "No tienes una suscripción activa que poder cambiar."
    case "NO_PAID_ACCESS":
      return "El acceso pagado todavía no está materializado en el servidor."
    case "LOCAL_GRACE":
      return "No puedes cambiar de plan durante el periodo de gracia. Gestiona el cobro pendiente desde tu tienda."
    case "EVIDENCE_INVALID":
      return "La evidencia de tu suscripción es inconsistente. Contacta soporte antes de cambiar de plan."
    case "CURRENT_VARIANT_UNKNOWN":
      return "No pudimos identificar tu plan actual dentro del catálogo vigente."
    case "UNSUPPORTED_STORE":
      return "Los cambios de plan solo están disponibles en Google Play."
    case "NO_CHANGE":
      return "Ese plan es idéntico al actual, así que no hay nada que cambiar."
    default:
      return "Este cambio de plan no está disponible en este momento."
  }
}

export function initialBillingCapacity(effectiveCapacity: number) {
  return Number.isInteger(effectiveCapacity) && effectiveCapacity >= 2 && effectiveCapacity <= 15
    ? effectiveCapacity
    : 2
}

export function billingPeriodDisplay(period: BillingOfferingPeriod) {
  return period.status === "AVAILABLE"
    ? {
      label: billingIntervalLabel(period.billingInterval),
      available: true as const,
      priceString: period.priceString,
      currencyCode: period.currencyCode,
    }
    : {
      label: billingIntervalLabel(period.billingInterval),
      available: false as const,
      priceString: null,
      currencyCode: null,
    }
}
