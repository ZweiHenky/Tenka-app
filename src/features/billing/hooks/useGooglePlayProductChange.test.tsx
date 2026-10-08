// @vitest-environment jsdom
import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BillingPackageResolutionError } from "@/infrastructure/billing/revenueCatPackage"
import { useGooglePlayProductChange } from "./useGooglePlayProductChange"

const mocks = vi.hoisted(() => ({
  confirmFirstChangeStep: vi.fn(),
  confirmFinalChangeStep: vi.fn(),
  purchasePackageChange: vi.fn(),
  reportCheckoutOutcome: vi.fn(),
  sync: vi.fn(),
}))

vi.mock("@/features/billing/api/billing", () => ({ billingApi: mocks }))
vi.mock("@/infrastructure/billing/revenueCatNative", () => ({
  developmentGooglePlayProductChangeClient: { purchasePackageChange: mocks.purchasePackageChange },
}))

const variants = {
  sourceVariant: {
    variantId: "source", logicalProductId: "tenka_capacity_2", billingInterval: "MONTHLY",
    capacity: 2, storeProductId: "tenka_capacity_2:monthly",
  },
  targetVariant: {
    variantId: "target", logicalProductId: "tenka_capacity_4", billingInterval: "ANNUAL",
    capacity: 4, storeProductId: "tenka_capacity_4:annual",
  },
}

function execution(step: "FIRST" | "FINAL") {
  return {
    operation: { id: "operation-1", version: 2 },
    attempt: {
      id: "attempt-1", offeringId: "capacity_4", packageId: "$rc_annual",
      productIdentifier: "tenka_capacity_4:annual", billingInterval: "ANNUAL",
    },
    instruction: {
      step,
      replacementMode: step === "FIRST" ? "CHARGE_PRORATED_PRICE" : "DEFERRED",
      ...variants,
    },
  }
}

function setup(enabled = true) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useGooglePlayProductChange({
    enabled,
    userId: "user-1",
    appUserId: "billing_account-1",
    role: "LIGA",
    catalogEnvironment: "PREVIEW",
    releaseVersion: "test-v1",
  }), { wrapper })
  return { ...hook, invalidate }
}

describe("useGooglePlayProductChange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.purchasePackageChange.mockResolvedValue(undefined)
    mocks.reportCheckoutOutcome.mockResolvedValue({})
    mocks.sync.mockResolvedValue({})
  })

  it("persists FIRST confirmation before exactly one native call and reconciles", async () => {
    mocks.confirmFirstChangeStep.mockResolvedValue(execution("FIRST"))
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync({
        step: "FIRST",
        targetVariantId: "target",
        expectedSourceVariantId: "source",
        previewFingerprint: "fingerprint",
      })).resolves.toEqual({ status: "SDK_CONFIRMED" })
    })

    expect(mocks.confirmFirstChangeStep).toHaveBeenCalledBefore(mocks.purchasePackageChange)
    expect(mocks.purchasePackageChange).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      oldProductIdentifier: "tenka_capacity_2:monthly",
      replacementMode: "CHARGE_PRORATED_PRICE",
      selection: {
        offeringId: "capacity_4", packageId: "$rc_annual",
        productIdentifier: "tenka_capacity_4:annual", subscriptionPeriod: "P1Y",
      },
    }))
    expect(mocks.reportCheckoutOutcome).toHaveBeenCalledWith("attempt-1", "SDK_CONFIRMED")
    expect(mocks.sync).toHaveBeenCalledWith("attempt-1")
    expect(invalidate).toHaveBeenCalledTimes(4)
  })

  it("uses the durable FINAL instruction and DEFERRED mode", async () => {
    mocks.confirmFinalChangeStep.mockResolvedValue(execution("FINAL"))
    const { result } = setup()

    await act(async () => {
      await result.current.mutateAsync({ step: "FINAL", operationId: "operation-1", expectedVersion: 7 })
    })

    expect(mocks.confirmFinalChangeStep).toHaveBeenCalledWith("operation-1", 7)
    expect(mocks.purchasePackageChange).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      replacementMode: "DEFERRED",
    }))
  })

  it("does no backend or native I/O until explicitly invoked", () => {
    setup()
    expect(mocks.confirmFirstChangeStep).not.toHaveBeenCalled()
    expect(mocks.confirmFinalChangeStep).not.toHaveBeenCalled()
    expect(mocks.purchasePackageChange).not.toHaveBeenCalled()
  })

  it("fails closed before confirmation when policy is disabled", async () => {
    const { result } = setup(false)
    await act(async () => {
      await expect(result.current.mutateAsync({
        step: "FIRST", targetVariantId: "target", expectedSourceVariantId: "source",
        previewFingerprint: "fingerprint",
      })).rejects.toMatchObject({ code: "DISABLED" })
    })
    expect(mocks.confirmFirstChangeStep).not.toHaveBeenCalled()
    expect(mocks.purchasePackageChange).not.toHaveBeenCalled()
  })

  it("reports ambiguous native failures and still requests sync", async () => {
    mocks.confirmFirstChangeStep.mockResolvedValue(execution("FIRST"))
    mocks.purchasePackageChange.mockRejectedValue({ code: "10" })
    const { result } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync({
        step: "FIRST", targetVariantId: "target", expectedSourceVariantId: "source",
        previewFingerprint: "fingerprint",
      })).resolves.toEqual({ status: "CONFIRMATION_AMBIGUOUS" })
    })
    expect(mocks.reportCheckoutOutcome).toHaveBeenCalledWith("attempt-1", "CONFIRMATION_AMBIGUOUS")
    expect(mocks.sync).toHaveBeenCalledWith("attempt-1")
  })

  it("does not report a store outcome when exact package resolution fails before purchase", async () => {
    mocks.confirmFirstChangeStep.mockResolvedValue(execution("FIRST"))
    mocks.purchasePackageChange.mockRejectedValue(new BillingPackageResolutionError("MISSING_PACKAGE"))
    const { result } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync({
        step: "FIRST", targetVariantId: "target", expectedSourceVariantId: "source",
        previewFingerprint: "fingerprint",
      })).rejects.toMatchObject({ code: "FAILED" })
    })
    expect(mocks.reportCheckoutOutcome).not.toHaveBeenCalled()
    expect(mocks.sync).toHaveBeenCalledWith("attempt-1")
  })

  it("prevents concurrent confirmations and native calls", async () => {
    let release!: () => void
    mocks.confirmFirstChangeStep.mockResolvedValue(execution("FIRST"))
    mocks.purchasePackageChange.mockReturnValue(new Promise<void>((resolve) => { release = resolve }))
    const request = {
      step: "FIRST" as const, targetVariantId: "target", expectedSourceVariantId: "source",
      previewFingerprint: "fingerprint",
    }
    const { result } = setup()
    await act(async () => {
      const first = result.current.mutateAsync(request)
      await vi.waitFor(() => expect(mocks.purchasePackageChange).toHaveBeenCalledOnce())
      await expect(result.current.mutateAsync(request)).rejects.toMatchObject({ code: "IN_PROGRESS" })
      release()
      await first
    })
    expect(mocks.confirmFirstChangeStep).toHaveBeenCalledOnce()
    expect(mocks.purchasePackageChange).toHaveBeenCalledOnce()
  })
})
