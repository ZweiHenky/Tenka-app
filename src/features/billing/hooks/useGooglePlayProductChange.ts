import { useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { billingApi } from "@/features/billing/api/billing"
import { subscriptionPeriodForBillingInterval } from "@/features/billing/offerings"
import type { BillingEnvironment } from "@/features/billing/types"
import { developmentGooglePlayProductChangeClient } from "@/infrastructure/billing/revenueCatNative"
import { BillingPackageResolutionError } from "@/infrastructure/billing/revenueCatPackage"
import { RevenueCatRuntimeError } from "@/infrastructure/billing/revenueCatRuntime"
import {
  classifyGooglePlaySandboxPurchaseError,
  GooglePlaySandboxPurchaseFlowError,
  type GooglePlaySandboxPurchaseOutcome,
} from "./useGooglePlaySandboxPurchase"
import { billingKeys } from "./queryKeys"

export type GooglePlayProductChangeInput =
  | {
    step: "FIRST"
    targetVariantId: string
    expectedSourceVariantId: string
    previewFingerprint: string
  }
  | {
    step: "FINAL"
    operationId: string
    expectedVersion: number
  }

export type GooglePlayProductChangeOutcome = GooglePlaySandboxPurchaseOutcome

export function useGooglePlayProductChange(input: {
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
    mutationFn: async (changeInput: GooglePlayProductChangeInput): Promise<GooglePlayProductChangeOutcome> => {
      if (!input.enabled || !input.userId || !input.appUserId
        || input.role !== "LIGA" || input.catalogEnvironment !== "PREVIEW") {
        throw new GooglePlaySandboxPurchaseFlowError("DISABLED")
      }
      if (inFlight.current) throw new GooglePlaySandboxPurchaseFlowError("IN_PROGRESS")
      inFlight.current = true
      try {
        const execution = changeInput.step === "FIRST"
          ? await billingApi.confirmFirstChangeStep({
            targetVariantId: changeInput.targetVariantId,
            expectedSourceVariantId: changeInput.expectedSourceVariantId,
            previewFingerprint: changeInput.previewFingerprint,
          })
          : await billingApi.confirmFinalChangeStep(changeInput.operationId, changeInput.expectedVersion)

        if (execution.instruction.step !== changeInput.step
          || (changeInput.step === "FIRST"
            && execution.instruction.replacementMode !== "CHARGE_PRORATED_PRICE")
          || (changeInput.step === "FINAL"
            && execution.instruction.replacementMode !== "DEFERRED")) {
          throw new GooglePlaySandboxPurchaseFlowError("FAILED")
        }

        let outcome: GooglePlayProductChangeOutcome
        try {
          await developmentGooglePlayProductChangeClient.purchasePackageChange({
            appUserId: input.appUserId,
            role: input.role,
            catalogEnvironment: input.catalogEnvironment,
            oldProductIdentifier: execution.instruction.sourceVariant.storeProductId,
            replacementMode: execution.instruction.replacementMode,
            selection: {
              offeringId: execution.attempt.offeringId,
              packageId: execution.attempt.packageId,
              productIdentifier: execution.attempt.productIdentifier,
              subscriptionPeriod: subscriptionPeriodForBillingInterval(execution.attempt.billingInterval),
            },
          })
          outcome = { status: "SDK_CONFIRMED" }
        } catch (error) {
          const classified = classifyGooglePlaySandboxPurchaseError(error)
          const definitelyBeforePurchase = error instanceof BillingPackageResolutionError
            || (error as { code?: unknown })?.code === "SANDBOX_DISABLED"
            || (error instanceof RevenueCatRuntimeError
              && error.code !== "PURCHASE_CONFIRMED_IDENTITY_CHANGED")
          if (classified instanceof GooglePlaySandboxPurchaseFlowError && definitelyBeforePurchase) {
            try {
              await billingApi.sync(execution.attempt.id)
            } catch {
              // The prepared attempt remains durable for background reconciliation.
            }
            throw classified
          }
          outcome = classified instanceof GooglePlaySandboxPurchaseFlowError
            ? { status: "CONFIRMATION_AMBIGUOUS" }
            : classified
        }

        try {
          await billingApi.reportCheckoutOutcome(execution.attempt.id, outcome.status)
        } catch {
          outcome = { status: "CONFIRMATION_AMBIGUOUS" }
        }
        try {
          await billingApi.sync(execution.attempt.id)
        } catch {
          // Confirmation is durable; reconciliation can continue from billing state.
        }
        return outcome
      } finally {
        inFlight.current = false
      }
    },
    onSettled: async () => {
      if (!input.userId) return
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: billingKeys.state(input.userId) }),
        queryClient.invalidateQueries({ queryKey: billingKeys.activeCheckout(input.userId) }),
        queryClient.invalidateQueries({ queryKey: billingKeys.purchaseSelection(input.userId) }),
      ]
      if (input.appUserId && input.releaseVersion && input.catalogEnvironment) {
        invalidations.push(queryClient.invalidateQueries({
          queryKey: billingKeys.offerings(
            input.appUserId,
            input.releaseVersion,
            "android",
            input.catalogEnvironment,
          ),
        }))
      }
      await Promise.all(invalidations)
    },
  })
}
