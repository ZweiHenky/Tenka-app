import { api } from "@/infrastructure/api/client"
import { withNetworkRetry } from "@/infrastructure/api/withNetworkRetry"
import type {
  BillingCatalog,
  BillingChangeOperation,
  BillingChangeExecutionResponse,
  BillingChangePreview,
  BillingCheckoutAttempt,
  BillingCheckoutOutcome,
  BillingInterval,
  BillingOperationalControl,
  BillingPurchaseSelection,
  BillingState,
  UpdateBillingOperationalControlInput,
} from "@/features/billing/types"

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

export interface BillingCheckoutSyncResult {
  status: "SYNCHRONIZED" | "PENDING"
  reason?: string
  attempt: BillingCheckoutAttempt | null
}

export interface BillingCheckoutAbandonResult {
  status: "ABANDONED" | "PENDING" | "SYNCHRONIZED"
  reason?: "reconciliation_busy" | "reconciliation_failed" | "commercial_evidence" | "checkout_busy" | "settlement_window"
  attempt: BillingCheckoutAttempt
}

function idempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function requiredMutationData<T>(response: { data: ApiResponse<T> }, operation: string): T {
  if (response.data.success !== true || response.data.data === undefined) {
    throw new Error(`Invalid ${operation} response`)
  }
  return response.data.data
}

export const billingApi = {
  getState: () =>
    api.get<ApiResponse<BillingState>>("/api/billing/state").then((response) => response.data.data!),
  bootstrap: () =>
    withNetworkRetry(() =>
      api.post<ApiResponse<BillingState>>("/api/billing/bootstrap").then((response) => response.data.data!)
    ),
  getCatalog: () =>
    api.get<ApiResponse<BillingCatalog>>("/api/billing/catalog").then((response) => response.data.data!),
  getOperationalControl: () =>
    api.get<ApiResponse<BillingOperationalControl>>("/api/billing/admin/operational-control")
      .then((response) => response.data.data!),
  updateOperationalControl: (input: UpdateBillingOperationalControlInput) => {
    const key = idempotencyKey("operational-control")
    return withNetworkRetry(() =>
      api.put<ApiResponse<BillingOperationalControl>>(
        "/api/billing/admin/operational-control",
        input,
        { headers: { "Idempotency-Key": key } },
      ).then((response) => response.data.data!)
    )
  },
  getPurchaseSelection: () =>
    api.get<ApiResponse<BillingPurchaseSelection | null>>("/api/billing/purchase-selection")
      .then((response) => response.data.data ?? null),
  putPurchaseSelection: (input: {
    logicalProductId: string
    billingInterval: BillingInterval
    divisionIds: string[]
    expectedVersion: number
  }) => api.put<ApiResponse<BillingPurchaseSelection>>("/api/billing/purchase-selection", input)
    .then((response) => response.data.data!),
  selectMigrationDivision: (divisionId: string) =>
    api.put<ApiResponse<{ selectedFreeDivisionIdSnapshot: string }>>(
      "/api/billing/migration-selection",
      { divisionId },
    ).then((response) => response.data.data!),
  getActiveCheckout: () =>
    api.get<ApiResponse<BillingCheckoutAttempt | null>>("/api/billing/checkout-attempts/active")
      .then((response) => response.data.data ?? null),
  startCheckout: (input: { purchaseSelectionId: string; expectedVersion: number }) => {
    const key = idempotencyKey("checkout-start")
    return withNetworkRetry(() => api.post<ApiResponse<BillingCheckoutAttempt>>(
      "/api/billing/checkout-attempts",
      { ...input, store: "GOOGLE" },
      { headers: { "Idempotency-Key": key } },
    ).then((response) => response.data.data!))
  },
  reportCheckoutOutcome: (attemptId: string, outcome: BillingCheckoutOutcome) => {
    const key = idempotencyKey("checkout-outcome")
    return withNetworkRetry(() => api.post<ApiResponse<BillingCheckoutAttempt>>(
      `/api/billing/checkout-attempts/${attemptId}/outcome`,
      { outcome },
      { headers: { "Idempotency-Key": key } },
    ).then((response) => response.data.data!))
  },
  abandonCheckout: (attemptId: string, expectedVersion: number) => {
    const key = idempotencyKey("checkout-abandon")
    return withNetworkRetry(() => api.post<ApiResponse<BillingCheckoutAbandonResult>>(
      `/api/billing/checkout-attempts/${attemptId}/abandon`,
      { expectedVersion },
      { headers: { "Idempotency-Key": key } },
    ).then((response) => response.data.data!))
  },
  changePreview: (input: { logicalProductId: string; billingInterval: BillingInterval }) => {
    return withNetworkRetry(() => api.post<ApiResponse<BillingChangePreview>>(
      "/api/billing/change-preview",
      input,
    ).then((response) => requiredMutationData(response, "billing change preview")))
  },
  confirmFirstChangeStep: (input: {
    targetVariantId: string
    expectedSourceVariantId: string
    previewFingerprint: string
  }) => {
    const key = idempotencyKey("change-first-confirm")
    return withNetworkRetry(() => api.post<ApiResponse<BillingChangeExecutionResponse>>(
      "/api/billing/change-operations/confirm",
      input,
      { headers: { "Idempotency-Key": key } },
    ).then((response) => requiredMutationData(response, "billing first change confirmation")))
  },
  confirmFinalChangeStep: (operationId: string, expectedVersion: number) => {
    const key = idempotencyKey("change-final-confirm")
    return withNetworkRetry(() => api.post<ApiResponse<BillingChangeExecutionResponse>>(
      `/api/billing/change-operations/${operationId}/final-step/confirm`,
      { expectedVersion },
      { headers: { "Idempotency-Key": key } },
    ).then((response) => requiredMutationData(response, "billing final change confirmation")))
  },
  abandonChangeOperation: (operationId: string) => {
    const key = idempotencyKey("change-abandon")
    return withNetworkRetry(() => api.post<ApiResponse<BillingChangeOperation>>(
      `/api/billing/change-operations/${operationId}/abandon`,
      {},
      { headers: { "Idempotency-Key": key } },
    ).then((response) => requiredMutationData(response, "billing change abandonment")))
  },
  sync: (checkoutAttemptId?: string) =>
    api.post<ApiResponse<BillingCheckoutSyncResult>>(
      "/api/billing/sync",
      checkoutAttemptId ? { checkoutAttemptId } : {},
    ).then((response) => response.data.data!),
}

export const billingApiInternals = { idempotencyKey }
