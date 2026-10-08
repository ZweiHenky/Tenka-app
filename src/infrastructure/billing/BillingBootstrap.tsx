import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/infrastructure/auth/client"
import { billingKeys } from "@/features/billing/hooks/queryKeys"
import { useBillingState, useBootstrapBillingAccount } from "@/features/billing/hooks/useBilling"
import { revenueCatClient } from "./revenueCatNative"

function warningCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code
  return typeof code === "string" ? code : "UNKNOWN"
}

export function BillingBootstrap() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const userId = session?.user?.id ?? null
  const queryClient = useQueryClient()
  const billingState = useBillingState(userId, !sessionPending)
  const bootstrap = useBootstrapBillingAccount()
  const attemptedBootstrapUserId = useRef<string | null>(null)
  const appUserId = billingState.data?.role === "LIGA"
    ? billingState.data.revenueCatAppUserId
    : null

  useEffect(() => {
    if (sessionPending) return
    if (userId) return

    attemptedBootstrapUserId.current = null
    revenueCatClient.detach()
    queryClient.removeQueries({ queryKey: billingKeys.states() })
    queryClient.removeQueries({ queryKey: [...billingKeys.all, "offerings"] })
  }, [queryClient, sessionPending, userId])

  useEffect(() => {
    if (!userId || billingState.data?.role !== "LIGA") return
    if (billingState.data.revenueCatAppUserId || bootstrap.isPending) return
    if (attemptedBootstrapUserId.current === userId) return

    attemptedBootstrapUserId.current = userId
    void bootstrap.mutateAsync(userId).catch((error) => {
      console.warn("[RevenueCat] billing identity bootstrap failed", warningCode(error))
    })
  }, [billingState.data, bootstrap, userId])

  useEffect(() => {
    if (sessionPending) return
    if (!appUserId || !userId) {
      revenueCatClient.detach()
      return
    }

    let disposed = false
    let unsubscribe: (() => void) | undefined
    void revenueCatClient.attach(appUserId).then((result) => {
      if (disposed || result.status !== "READY") return
      unsubscribe = revenueCatClient.subscribeToCustomerInfo(appUserId, () => {
        void queryClient.invalidateQueries({ queryKey: billingKeys.state(userId) })
      })
    }).catch((error) => {
      if (!disposed) console.warn("[RevenueCat] identity attachment failed", warningCode(error))
    })

    return () => {
      disposed = true
      unsubscribe?.()
      revenueCatClient.detach()
      queryClient.removeQueries({ queryKey: [...billingKeys.all, "offerings", appUserId] })
    }
  }, [appUserId, queryClient, sessionPending, userId])

  return null
}
