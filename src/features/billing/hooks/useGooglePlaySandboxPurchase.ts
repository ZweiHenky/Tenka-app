import { useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { PurchasesError } from "react-native-purchases"
import { developmentGooglePlaySandboxClient } from "@/infrastructure/billing/revenueCatNative"
import { RevenueCatRuntimeError } from "@/infrastructure/billing/revenueCatRuntime"
import { subscriptionPeriodForBillingInterval } from "@/features/billing/offerings"
import type {
  BillingCheckoutOutcome,
  BillingEnvironment,
  BillingOfferingPeriod,
} from "@/features/billing/types"
import { billingKeys } from "./queryKeys"
import { billingApi } from "@/features/billing/api/billing"

type AvailablePeriod = Extract<BillingOfferingPeriod, { status: "AVAILABLE" }>
type PurchaseInput = { period: AvailablePeriod; divisionIds: string[] }

export type GooglePlaySandboxPurchaseOutcome =
  | { status: "SDK_CONFIRMED" }
  | { status: "CANCELED" }
  | { status: "PENDING" }
  | { status: "ALREADY_PURCHASED" }
  | { status: "OWNERSHIP_CONFLICT" }
  | { status: "CONFIRMATION_AMBIGUOUS" }

export class GooglePlaySandboxPurchaseFlowError extends Error {
  constructor(public readonly code: "DISABLED" | "IN_PROGRESS" | "RETRYABLE" | "FAILED") {
    super(`Google Play sandbox purchase failed (${code})`)
    this.name = "GooglePlaySandboxPurchaseFlowError"
  }
}

const PURCHASES_ERROR_CODE = {
  PURCHASE_CANCELLED_ERROR: "1",
  PRODUCT_ALREADY_PURCHASED_ERROR: "6",
  RECEIPT_ALREADY_IN_USE_ERROR: "7",
  NETWORK_ERROR: "10",
  RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR: "13",
  OPERATION_ALREADY_IN_PROGRESS_ERROR: "15",
  PAYMENT_PENDING_ERROR: "20",
  PRODUCT_REQUEST_TIMED_OUT_ERROR: "32",
  OFFLINE_CONNECTION_ERROR: "35",
} as const

function purchasesErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || typeof (error as Partial<PurchasesError>).code !== "string") {
    return null
  }
  return (error as PurchasesError).code
}

export function classifyGooglePlaySandboxPurchaseError(
  error: unknown,
): GooglePlaySandboxPurchaseOutcome | GooglePlaySandboxPurchaseFlowError {
  if (error instanceof RevenueCatRuntimeError
    && error.code === "PURCHASE_CONFIRMED_IDENTITY_CHANGED") {
    return { status: "CONFIRMATION_AMBIGUOUS" }
  }
  switch (purchasesErrorCode(error)) {
    case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
      return { status: "CANCELED" }
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return { status: "PENDING" }
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return { status: "ALREADY_PURCHASED" }
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:
      return { status: "OWNERSHIP_CONFLICT" }
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
    case PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR:
      return new GooglePlaySandboxPurchaseFlowError("RETRYABLE")
    case PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR:
      return new GooglePlaySandboxPurchaseFlowError("IN_PROGRESS")
    default:
      return new GooglePlaySandboxPurchaseFlowError("FAILED")
  }
}

export function useGooglePlaySandboxPurchase(input: {
  enabled: boolean
  userId: string | null | undefined
  appUserId: string | null | undefined
  role: string | null | undefined
  catalogEnvironment: BillingEnvironment | null | undefined
  releaseVersion: string | null | undefined
}) {
  const queryClient = useQueryClient()
  const inFlight = useRef(false)
  return useMutation({
    mutationFn: async (purchaseInput: PurchaseInput): Promise<GooglePlaySandboxPurchaseOutcome> => {
      if (!input.enabled || !input.userId || !input.appUserId
        || input.role !== "LIGA" || input.catalogEnvironment !== "PREVIEW") {
        throw new GooglePlaySandboxPurchaseFlowError("DISABLED")
      }
      if (inFlight.current) throw new GooglePlaySandboxPurchaseFlowError("IN_PROGRESS")
      inFlight.current = true
      try {
        const currentSelection = await billingApi.getPurchaseSelection()
        if (currentSelection?.status === "LOCKED") {
          throw new GooglePlaySandboxPurchaseFlowError("IN_PROGRESS")
        }
        const selection = await billingApi.putPurchaseSelection({
          logicalProductId: `tenka_capacity_${purchaseInput.period.capacity}`,
          billingInterval: purchaseInput.period.billingInterval,
          divisionIds: purchaseInput.divisionIds,
          expectedVersion: currentSelection?.version ?? 0,
        })
        const attempt = await billingApi.startCheckout({
          purchaseSelectionId: selection.id,
          expectedVersion: selection.version,
        })
        let outcome: GooglePlaySandboxPurchaseOutcome
        try {
          await developmentGooglePlaySandboxClient.purchase({
            appUserId: input.appUserId,
            role: input.role,
            catalogEnvironment: input.catalogEnvironment,
            selection: {
              offeringId: attempt.offeringId,
              packageId: attempt.packageId,
              productIdentifier: attempt.productIdentifier,
              subscriptionPeriod: subscriptionPeriodForBillingInterval(attempt.billingInterval),
            },
          })
          outcome = { status: "SDK_CONFIRMED" }
        } catch (error) {
          const classified = classifyGooglePlaySandboxPurchaseError(error)
          outcome = classified instanceof GooglePlaySandboxPurchaseFlowError
            ? { status: "CONFIRMATION_AMBIGUOUS" }
            : classified
        }

        let reportedOutcome: BillingCheckoutOutcome = outcome.status
        try {
          await billingApi.reportCheckoutOutcome(attempt.id, reportedOutcome)
        } catch {
          // Native I/O already happened. Preserve the durable attempt and never suggest repurchase.
          outcome = { status: "CONFIRMATION_AMBIGUOUS" }
          reportedOutcome = outcome.status
        }
        if (reportedOutcome !== "PENDING" && outcome.status !== "CONFIRMATION_AMBIGUOUS") {
          try {
            await billingApi.sync(attempt.id)
          } catch {
            // The durable attempt remains authoritative and can be reconciled later.
          }
        }
        return outcome
      } finally {
        inFlight.current = false
      }
    },
    onSuccess: async (outcome) => {
      if (!input.userId || !input.appUserId || !input.releaseVersion || !input.catalogEnvironment) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingKeys.state(input.userId) }),
        queryClient.invalidateQueries({ queryKey: billingKeys.purchaseSelection(input.userId) }),
        queryClient.invalidateQueries({ queryKey: billingKeys.activeCheckout(input.userId) }),
        queryClient.invalidateQueries({
          queryKey: billingKeys.offerings(
            input.appUserId,
            input.releaseVersion,
            "android",
            input.catalogEnvironment,
          ),
        }),
      ])
    },
  })
}
