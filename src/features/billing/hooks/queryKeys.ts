import type { BillingEnvironment } from "@/features/billing/types"

export const billingKeys = {
  all: ["billing"] as const,
  states: () => [...billingKeys.all, "me"] as const,
  state: (userId: string) => [...billingKeys.states(), userId] as const,
  catalog: () => [...billingKeys.all, "catalog"] as const,
  operationalControl: (userId: string) => [...billingKeys.all, "admin", "operational-control", userId] as const,
  purchaseSelection: (userId: string) => [...billingKeys.all, "purchase-selection", userId] as const,
  activeCheckout: (userId: string) => [...billingKeys.all, "checkout", "active", userId] as const,
  offerings: (
    appUserId: string,
    releaseVersion: string,
    platform: "ios" | "android",
    environment: BillingEnvironment,
  ) => [...billingKeys.all, "offerings", appUserId, releaseVersion, platform, environment] as const,
}
