// @vitest-environment jsdom
import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { billingKeys } from "./queryKeys"
import {
  useAbandonBillingCheckout,
  useBillingCatalog,
  useBillingOperationalControl,
  useBillingState,
  useBootstrapBillingAccount,
  useConfirmBillingChangeFinalStep,
  useConfirmBillingChangeFirstStep,
  useReportBillingCheckoutOutcome,
  useSyncBillingCheckout,
  useUpdateBillingOperationalControl,
} from "./useBilling"

const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  confirmFinalChangeStep: vi.fn(),
  confirmFirstChangeStep: vi.fn(),
  abandonCheckout: vi.fn(),
  getCatalog: vi.fn(),
  getOperationalControl: vi.fn(),
  getState: vi.fn(),
  reportCheckoutOutcome: vi.fn(),
  sync: vi.fn(),
  updateOperationalControl: vi.fn(),
}))

vi.mock("@/features/billing/api/billing", () => ({ billingApi: mocks }))

function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe("billing hooks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("does not request state without an authenticated user", () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useBillingState(null), { wrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mocks.getState).not.toHaveBeenCalled()
  })

  it("stores billing state in the authenticated user's cache entry", async () => {
    const state = { role: "LIGA", revenueCatAppUserId: "billing-1", purchasesEnabled: false }
    mocks.getState.mockResolvedValue(state)
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useBillingState("user-1"), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(state))
    expect(client.getQueryData(billingKeys.state("user-1"))).toEqual(state)
    expect(client.getQueryData(billingKeys.state("user-2"))).toBeUndefined()
  })

  it.each(["CAPITAN", "ADMINISTRADOR"] as const)("does not request the catalog for %s", (role) => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useBillingCatalog(role), { wrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mocks.getCatalog).not.toHaveBeenCalled()
  })

  it("requests the catalog for a LIGA account", async () => {
    const catalog = { available: true, environment: "PREVIEW", release: null, purchasesEnabled: false }
    mocks.getCatalog.mockResolvedValue(catalog)
    const { wrapper } = setup()
    const { result } = renderHook(() => useBillingCatalog("LIGA"), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(catalog))
    expect(mocks.getCatalog).toHaveBeenCalledOnce()
  })

  it.each(["CAPITAN", "LIGA"] as const)("does not request operational control for %s", (role) => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useBillingOperationalControl("user-1", role), { wrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mocks.getOperationalControl).not.toHaveBeenCalled()
  })

  it("requests operational control for an administrator", async () => {
    const control = {
      environment: "PREVIEW", mode: "PURCHASES_PAUSED", reason: "Initial rollout pause",
      changedAt: "2026-10-02T20:00:00.000Z", version: 1,
    }
    mocks.getOperationalControl.mockResolvedValue(control)
    const { wrapper } = setup()
    const { result } = renderHook(
      () => useBillingOperationalControl("admin-1", "ADMINISTRADOR"),
      { wrapper },
    )

    await waitFor(() => expect(result.current.data).toEqual(control))
    expect(mocks.getOperationalControl).toHaveBeenCalledOnce()
  })

  it("stores an updated control only in the current administrator cache", async () => {
    const control = {
      environment: "PREVIEW", mode: "ENABLED", reason: "Closed Google Play sandbox test",
      changedAt: "2026-10-02T20:00:00.000Z", version: 2,
    }
    const input = { mode: "ENABLED" as const, reason: control.reason, expectedVersion: 1 }
    mocks.updateOperationalControl.mockResolvedValue(control)
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useUpdateBillingOperationalControl("admin-1"), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(input)
    })

    expect(mocks.updateOperationalControl).toHaveBeenCalledWith(input, expect.anything())
    expect(client.getQueryData(billingKeys.operationalControl("admin-1"))).toEqual(control)
    expect(client.getQueryData(billingKeys.operationalControl("admin-2"))).toBeUndefined()
  })

  it("updates only the user's state after a manual bootstrap", async () => {
    const state = { role: "LIGA", revenueCatAppUserId: "billing-1", purchasesEnabled: false }
    mocks.bootstrap.mockResolvedValue(state)
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useBootstrapBillingAccount(), { wrapper })

    expect(mocks.bootstrap).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.mutateAsync("user-1")
    })

    expect(client.getQueryData(billingKeys.state("user-1"))).toEqual(state)
    expect(client.getQueryData(billingKeys.state("user-2"))).toBeUndefined()
  })

  it("returns pending sync results and invalidates authoritative checkout state", async () => {
    const syncResult = {
      status: "PENDING", reason: "checkout_pending",
      attempt: { id: "attempt-1", status: "VERIFICATION_PENDING" },
    }
    mocks.sync.mockResolvedValue(syncResult)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useSyncBillingCheckout("user-1"), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync("attempt-1")).resolves.toEqual(syncResult)
    })
    expect(mocks.sync).toHaveBeenCalledWith("attempt-1")
    expect(invalidate).toHaveBeenCalledTimes(3)
  })

  it("invalidates authoritative checkout state after abandonment", async () => {
    const abandonResult = { status: "ABANDONED", attempt: { id: "attempt-1", status: "ABANDONED" } }
    mocks.abandonCheckout.mockResolvedValue(abandonResult)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useAbandonBillingCheckout("user-1"), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ attemptId: "attempt-1", expectedVersion: 3 }))
        .resolves.toEqual(abandonResult)
    })
    expect(mocks.abandonCheckout).toHaveBeenCalledWith("attempt-1", 3)
    expect(invalidate).toHaveBeenCalledTimes(3)
  })

  it("confirms first and final change steps and invalidates authoritative state", async () => {
    mocks.confirmFirstChangeStep.mockResolvedValue({ instruction: { step: "FIRST" } })
    mocks.confirmFinalChangeStep.mockResolvedValue({ instruction: { step: "FINAL" } })
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, "invalidateQueries")
    const first = renderHook(() => useConfirmBillingChangeFirstStep("user-1"), { wrapper })
    const final = renderHook(() => useConfirmBillingChangeFinalStep("user-1"), { wrapper })
    const firstInput = {
      targetVariantId: "target", expectedSourceVariantId: "source", previewFingerprint: "fingerprint",
    }

    await act(async () => {
      await first.result.current.mutateAsync(firstInput)
      await final.result.current.mutateAsync({ operationId: "operation-1", expectedVersion: 3 })
    })

    expect(mocks.confirmFirstChangeStep).toHaveBeenCalledWith(firstInput, expect.anything())
    expect(mocks.confirmFinalChangeStep).toHaveBeenCalledWith("operation-1", 3)
    expect(invalidate).toHaveBeenCalledTimes(6)
  })

  it("reports checkout outcomes and invalidates even when reporting fails", async () => {
    mocks.reportCheckoutOutcome.mockRejectedValue(new Error("offline"))
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useReportBillingCheckoutOutcome("user-1"), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ attemptId: "attempt-1", outcome: "PENDING" }))
        .rejects.toThrow("offline")
    })
    expect(mocks.reportCheckoutOutcome).toHaveBeenCalledWith("attempt-1", "PENDING")
    expect(invalidate).toHaveBeenCalledTimes(3)
  })
})
