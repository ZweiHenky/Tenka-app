import { describe, expect, it } from "vitest"
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
} from "./billing-display"
import type { BillingOfferingPeriod } from "../types"

describe("billing display", () => {
  it.each([
    ["FREE", "Plan gratuito"],
    ["PAID", "Suscripción activa"],
    ["LOCAL_GRACE", "Periodo de gracia"],
    ["MIGRATION", "Acceso de transición"],
    ["ENTERPRISE", "Enterprise"],
    ["ADMIN", "Acceso de administrador"],
  ] as const)("labels %s access", (access, label) => {
    expect(billingAccessLabel(access)).toBe(label)
  })

  it("explains why an active subscription cannot start another initial purchase", () => {
    expect(billingInitialPurchaseNotice("PAID", 2)).toBe(
      "Tu suscripción activa incluye capacidad para 2 divisiones. Puedes consultar otros planes y precios, pero los cambios de plan aún no están disponibles.",
    )
    expect(billingInitialPurchaseNotice("LOCAL_GRACE", 3)).toBe(
      "Conservas temporalmente acceso para 3 divisiones durante el periodo de gracia. Puedes consultar los planes y precios, pero no iniciar otra compra desde aquí.",
    )
    expect(billingInitialPurchaseNotice("FREE", 1)).toBeNull()
  })

  it.each([
    ["MONTHLY", "Mensual"],
    ["QUARTERLY", "Trimestral"],
    ["ANNUAL", "Anual"],
  ] as const)("labels %s intervals", (interval, label) => {
    expect(billingIntervalLabel(interval)).toBe(label)
  })

  it("selects the effective paid capacity only within the catalog range", () => {
    expect(initialBillingCapacity(2)).toBe(2)
    expect(initialBillingCapacity(11)).toBe(11)
    expect(initialBillingCapacity(15)).toBe(15)
    expect(initialBillingCapacity(1)).toBe(2)
    expect(initialBillingCapacity(16)).toBe(2)
    expect(initialBillingCapacity(2.5)).toBe(2)
  })

  it("preserves the store price without calculating or normalizing it", () => {
    const period: BillingOfferingPeriod = {
      capacity: 2,
      billingInterval: "MONTHLY",
      offeringId: "capacity_2",
      packageId: "$rc_monthly",
      productIdentifier: "store-product",
      status: "AVAILABLE",
      priceString: "$259.00",
      currencyCode: "MXN",
    }

    expect(billingPeriodDisplay(period)).toEqual({
      label: "Mensual",
      available: true,
      priceString: "$259.00",
      currencyCode: "MXN",
    })
  })

  it("hides technical details for an unavailable store period", () => {
    const period: BillingOfferingPeriod = {
      capacity: 2,
      billingInterval: "MONTHLY",
      offeringId: "capacity_2",
      packageId: "$rc_monthly",
      productIdentifier: "store-product",
      status: "UNAVAILABLE",
      reason: "PRODUCT_MISMATCH",
      priceString: null,
      currencyCode: null,
    }

    expect(billingPeriodDisplay(period)).toEqual({
      label: "Mensual",
      available: false,
      priceString: null,
      currencyCode: null,
    })
  })

  it("labels both supported stores", () => {
    expect(billingStoreLabel("APPLE")).toBe("App Store")
    expect(billingStoreLabel("GOOGLE")).toBe("Google Play")
  })

  it("names the store where the subscription is managed", () => {
    expect(subscriptionManagementActionLabel("GOOGLE")).toBe("Gestionar en Google Play")
    expect(subscriptionManagementActionLabel("APPLE")).toBe("Gestionar en App Store")
  })

  it("explains that an active subscription is managed in the original store", () => {
    expect(subscriptionManagementNotice("GOOGLE", true)).toBe(
      "Cancela, pausa o cambia tu suscripción directamente en Google Play. El acceso se actualiza cuando la tienda lo confirma.",
    )
    expect(subscriptionManagementNotice("GOOGLE", null)).toBe(
      "Cancela, pausa o cambia tu suscripción directamente en Google Play. El acceso se actualiza cuando la tienda lo confirma.",
    )
    expect(subscriptionManagementNotice("GOOGLE", undefined)).toBe(
      "Cancela, pausa o cambia tu suscripción directamente en Google Play. El acceso se actualiza cuando la tienda lo confirma.",
    )
  })

  it("tells a canceled subscription that it ends with the current period", () => {
    expect(subscriptionManagementNotice("GOOGLE", false)).toBe(
      "Tu suscripción en Google Play está cancelada y termina al cerrar el periodo actual. Puedes reactivarla desde tu tienda.",
    )
  })

  it("explains every server-authoritative change action without suggesting a duplicate purchase", () => {
    expect(billingNextActionNotice("SCHEDULE_PERIOD_CHANGE")).toContain("cambio de periodo")
    expect(billingNextActionNotice("WAIT_FOR_FIRST_VERIFICATION")).toContain("No vuelvas a abrir Google Play")
    expect(billingNextActionNotice("WAIT_FOR_SCHEDULE_VERIFICATION")).toContain("No repitas el cambio")
    expect(billingNextActionNotice(null)).toBeNull()
    expect(billingNextActionNotice(undefined)).toBeNull()
  })

  it("labels every change direction and timing", () => {
    expect(billingChangeDirectionLabel("UPGRADE")).toBe("Cambio a un plan superior")
    expect(billingChangeDirectionLabel("DOWNGRADE")).toBe("Cambio a un plan inferior")
    expect(billingChangeDirectionLabel("SAME")).toBe("Cambio de periodicidad")
    expect(billingChangeDirectionLabel(null)).toBe("Cambio de periodicidad")
    expect(billingChangeTimingLabel("IMMEDIATE")).toBe("Se aplicaría de inmediato")
    expect(billingChangeTimingLabel("TWO_STEP")).toBe("Se aplicaría en dos pasos")
    expect(billingChangeTimingLabel("DEFERRED")).toBe("Se aplicaría en la siguiente renovación")
    expect(billingChangeTimingLabel(null)).toBe("Sin cambios")
  })

  it("distinguishes a recovered second step from a local preview", () => {
    expect(billingChangeOperationStatusLabel("SECOND_STEP_PENDING")).toBe("Segundo paso pendiente")
    expect(billingChangeOperationStatusLabel("DRAFT")).toBe("Operación de cambio en curso")
    expect(billingChangeOperationStatusLabel("CANCELED")).toBe("Cambio cancelado")
  })

  it("does not encourage retrying while a billing change is already active", () => {
    expect(billingChangeRequestErrorNotice("BILLING_CHANGE_IN_PROGRESS")).toContain("Actualiza esta pantalla")
    expect(billingChangeRequestErrorNotice("BILLING_CHANGE_IN_PROGRESS")).not.toContain("Inténtalo nuevamente")
    expect(billingChangeRequestErrorNotice("BILLING_PURCHASES_PAUSED")).toContain("no cambió")
    expect(billingChangeRequestErrorNotice(undefined)).toContain("vista previa")
  })

  it("maps stale abandonment errors to a state refresh", () => {
    expect(billingChangeAbandonErrorNotice("BILLING_CHANGE_OPERATION_NOT_ABANDONABLE")).toContain("Actualiza")
    expect(billingChangeAbandonErrorNotice("BILLING_CHANGE_OPERATION_CHANGED")).toContain("Recarga")
    expect(billingChangeAbandonErrorNotice(undefined)).not.toContain("Inténtalo nuevamente")
  })

  it("explains why a change preview is not eligible", () => {
    expect(billingChangeIneligibleNotice("NO_ACTIVE_SUBSCRIPTION")).toContain("suscripción activa")
    expect(billingChangeIneligibleNotice("NO_PAID_ACCESS")).toContain("materializado")
    expect(billingChangeIneligibleNotice("LOCAL_GRACE")).toContain("periodo de gracia")
    expect(billingChangeIneligibleNotice("EVIDENCE_INVALID")).toContain("inconsistente")
    expect(billingChangeIneligibleNotice("CURRENT_VARIANT_UNKNOWN")).toContain("catálogo")
    expect(billingChangeIneligibleNotice("UNSUPPORTED_STORE")).toContain("Google Play")
    expect(billingChangeIneligibleNotice("NO_CHANGE")).toContain("idéntico")
    expect(billingChangeIneligibleNotice(null)).toContain("no está disponible")
  })
})
