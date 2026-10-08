import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UserRole } from "@/domain/interfaces/user"
import { billingApi } from "@/features/billing/api/billing"
import { billingKeys } from "@/features/billing/hooks/queryKeys"
import type { BillingCheckoutOutcome, BillingInterval } from "@/features/billing/types"

async function invalidateBillingExecutionState(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | null | undefined,
) {
  if (!userId) return
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: billingKeys.state(userId) }),
    queryClient.invalidateQueries({ queryKey: billingKeys.activeCheckout(userId) }),
    queryClient.invalidateQueries({ queryKey: billingKeys.purchaseSelection(userId) }),
  ])
}

export function useBillingState(userId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: billingKeys.state(userId ?? "anonymous"),
    queryFn: billingApi.getState,
    enabled: enabled && !!userId,
    staleTime: 30_000,
    refetchInterval: (query) => query.state.data?.activeChangeOperation ? 5_000 : false,
  })
}

export function useBillingCatalog(role: UserRole | null | undefined, enabled = true) {
  return useQuery({
    queryKey: billingKeys.catalog(),
    queryFn: billingApi.getCatalog,
    enabled: enabled && role === "LIGA",
    staleTime: 5 * 60_000,
  })
}

export function useBillingOperationalControl(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.operationalControl(userId ?? "anonymous"),
    queryFn: billingApi.getOperationalControl,
    enabled: enabled && !!userId && role === "ADMINISTRADOR",
    staleTime: 30_000,
  })
}

export function useUpdateBillingOperationalControl(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billingApi.updateOperationalControl,
    onSuccess: (control) => {
      if (userId) queryClient.setQueryData(billingKeys.operationalControl(userId), control)
    },
  })
}

export function useActiveBillingCheckout(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.activeCheckout(userId ?? "anonymous"),
    queryFn: billingApi.getActiveCheckout,
    enabled: enabled && !!userId && role === "LIGA",
    staleTime: 5_000,
    refetchInterval: (query) => query.state.data ? 5_000 : false,
  })
}

export function useBillingPurchaseSelection(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.purchaseSelection(userId ?? "anonymous"),
    queryFn: billingApi.getPurchaseSelection,
    enabled: enabled && !!userId && role === "LIGA",
  })
}

export function useSyncBillingCheckout(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (checkoutAttemptId?: string) => billingApi.sync(checkoutAttemptId),
    onSuccess: () => invalidateBillingExecutionState(queryClient, userId),
  })
}

export function useReportBillingCheckoutOutcome(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ attemptId, outcome }: { attemptId: string; outcome: BillingCheckoutOutcome }) =>
      billingApi.reportCheckoutOutcome(attemptId, outcome),
    onSettled: () => invalidateBillingExecutionState(queryClient, userId),
  })
}

export function useConfirmBillingChangeFirstStep(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billingApi.confirmFirstChangeStep,
    onSettled: () => invalidateBillingExecutionState(queryClient, userId),
  })
}

export function useConfirmBillingChangeFinalStep(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ operationId, expectedVersion }: { operationId: string; expectedVersion: number }) =>
      billingApi.confirmFinalChangeStep(operationId, expectedVersion),
    onSettled: () => invalidateBillingExecutionState(queryClient, userId),
  })
}

export function useAbandonBillingCheckout(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ attemptId, expectedVersion }: { attemptId: string; expectedVersion: number }) =>
      billingApi.abandonCheckout(attemptId, expectedVersion),
    onSuccess: async () => {
      if (!userId) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingKeys.state(userId) }),
        queryClient.invalidateQueries({ queryKey: billingKeys.activeCheckout(userId) }),
        queryClient.invalidateQueries({ queryKey: billingKeys.purchaseSelection(userId) }),
      ])
    },
  })
}

export function useSelectMigrationDivision(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (divisionId: string) => billingApi.selectMigrationDivision(divisionId),
    onSuccess: async () => {
      if (userId) await queryClient.invalidateQueries({ queryKey: billingKeys.state(userId) })
    },
  })
}

export function usePreviewBillingChange(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { logicalProductId: string; billingInterval: BillingInterval }) =>
      billingApi.changePreview(input),
    onSuccess: async () => {
      if (userId) await queryClient.invalidateQueries({ queryKey: billingKeys.state(userId) })
    },
  })
}

export function useAbandonBillingChangeOperation(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (operationId: string) => billingApi.abandonChangeOperation(operationId),
    onSuccess: async () => {
      if (userId) await queryClient.invalidateQueries({ queryKey: billingKeys.state(userId) })
    },
    onError: async () => {
      if (userId) await queryClient.invalidateQueries({ queryKey: billingKeys.state(userId) })
    },
  })
}

export function useBootstrapBillingAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (_userId: string) => billingApi.bootstrap(),
    onSuccess: (state, userId) => queryClient.setQueryData(billingKeys.state(userId), state),
  })
}
