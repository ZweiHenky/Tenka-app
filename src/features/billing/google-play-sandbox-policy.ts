import type { AppEnv } from "@/infrastructure/config/env"
import type { BillingEnvironment, EffectiveBillingAccess } from "./types"

type GooglePlaySandboxPolicyInput = {
  appEnvironment: AppEnv
  platform: string
  catalogEnvironment: BillingEnvironment | null | undefined
  explicitlyEnabled: boolean
  role: string | null | undefined
  appUserId: string | null | undefined
}

export function canUseGooglePlaySandboxPurchases(input: GooglePlaySandboxPolicyInput): boolean {
  const appUserId = input.appUserId?.trim()
  return (input.appEnvironment === "local" || input.appEnvironment === "preview")
    && input.platform === "android"
    && input.catalogEnvironment === "PREVIEW"
    && input.explicitlyEnabled
    && input.role === "LIGA"
    && !!appUserId
    && appUserId.startsWith("billing_")
    && appUserId.length <= 100
    && !appUserId.includes("/")
}

export function canStartGooglePlaySandboxPurchase(input: {
  runtimeEligible: boolean
  effectiveAccess: EffectiveBillingAccess | null | undefined
  billingStatePurchasesEnabled: boolean
  catalogPurchasesEnabled: boolean
  activeCheckoutRecovered: boolean
  activeCheckoutExists: boolean
  prerequisitesReady: boolean
}): boolean {
  return input.runtimeEligible
    && (input.effectiveAccess === "FREE" || input.effectiveAccess === "MIGRATION")
    && input.billingStatePurchasesEnabled
    && input.catalogPurchasesEnabled
    && input.activeCheckoutRecovered
    && !input.activeCheckoutExists
    && input.prerequisitesReady
}
