// @vitest-environment jsdom
import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  GooglePlaySandboxPurchaseFlowError,
  useGooglePlaySandboxPurchase,
} from "./useGooglePlaySandboxPurchase"
import { RevenueCatRuntimeError } from "@/infrastructure/billing/revenueCatRuntime"

const mocks = vi.hoisted(() => ({
  purchase: vi.fn(),
  getPurchaseSelection: vi.fn(),
  putPurchaseSelection: vi.fn(),
  startCheckout: vi.fn(),
  reportCheckoutOutcome: vi.fn(),
  sync: vi.fn(),
}))
vi.mock("@/infrastructure/billing/revenueCatNative", () => ({
  developmentGooglePlaySandboxClient: { purchase: mocks.purchase },
}))
vi.mock("@/features/billing/api/billing", () => ({
  billingApi: {
    getPurchaseSelection: mocks.getPurchaseSelection,
    putPurchaseSelection: mocks.putPurchaseSelection,
    startCheckout: mocks.startCheckout,
    reportCheckoutOutcome: mocks.reportCheckoutOutcome,
    sync: mocks.sync,
  },
}))

const period = {
  capacity: 2,
  billingInterval: "MONTHLY" as const,
  offeringId: "capacity_2",
  packageId: "$rc_monthly",
  productIdentifier: "tenka_capacity_2:monthly",
  status: "AVAILABLE" as const,
  priceString: "$259.00",
  currencyCode: "MXN",
}
const purchase = { period, divisionIds: ["division-2"] }

function setup(enabled = true) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useGooglePlaySandboxPurchase({
    enabled,
    userId: "user-1",
    appUserId: "billing_account-1",
    role: "LIGA",
    catalogEnvironment: "PREVIEW",
    releaseVersion: "test-v1",
  }), { wrapper })
  return { ...hook, invalidate }
}

describe("useGooglePlaySandboxPurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPurchaseSelection.mockResolvedValue(null)
    mocks.putPurchaseSelection.mockResolvedValue({ id: "selection-1", version: 1, status: "DRAFT", items: [] })
    mocks.startCheckout.mockResolvedValue({
      id: "attempt-1", offeringId: "capacity_2", packageId: "$rc_monthly",
      productIdentifier: "tenka_capacity_2:monthly", billingInterval: "MONTHLY",
    })
    mocks.reportCheckoutOutcome.mockResolvedValue({ id: "attempt-1", status: "VERIFICATION_PENDING" })
    mocks.sync.mockResolvedValue({
      status: "PENDING", reason: "checkout_pending",
      attempt: { id: "attempt-1", status: "VERIFICATION_PENDING" },
    })
  })

  it("purchases the exact selected package and invalidates authoritative reads", async () => {
    mocks.purchase.mockResolvedValue(undefined)
    const { result, invalidate } = setup()
    await act(async () => {
      await expect(result.current.mutateAsync(purchase)).resolves.toEqual({ status: "SDK_CONFIRMED" })
    })
    expect(mocks.purchase).toHaveBeenCalledWith(expect.objectContaining({
      appUserId: "billing_account-1",
      selection: {
        offeringId: "capacity_2",
        packageId: "$rc_monthly",
        productIdentifier: "tenka_capacity_2:monthly",
        subscriptionPeriod: "P1M",
      },
    }))
    expect(mocks.startCheckout).toHaveBeenCalledWith({ purchaseSelectionId: "selection-1", expectedVersion: 1 })
    expect(mocks.putPurchaseSelection).toHaveBeenCalledWith(expect.objectContaining({ divisionIds: ["division-2"] }))
    expect(mocks.reportCheckoutOutcome).toHaveBeenCalledWith("attempt-1", "SDK_CONFIRMED")
    expect(mocks.sync).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledTimes(4)
  })

  it.each([
    ["1", "CANCELED"],
    ["20", "PENDING"],
    ["6", "ALREADY_PURCHASED"],
    ["13", "OWNERSHIP_CONFLICT"],
  ] as const)("maps SDK error %s to %s without exposing its message", async (code, status) => {
    mocks.purchase.mockRejectedValue({ code, message: "private purchase token" })
    const { result } = setup()
    await act(async () => {
      await expect(result.current.mutateAsync(purchase)).resolves.toEqual({ status })
    })
  })

  it("fails before native I/O when the sandbox policy is disabled", async () => {
    const { result } = setup(false)
    await act(async () => {
      await expect(result.current.mutateAsync(purchase)).rejects.toEqual(
        expect.objectContaining<Partial<GooglePlaySandboxPurchaseFlowError>>({ code: "DISABLED" }),
      )
    })
    expect(mocks.getPurchaseSelection).not.toHaveBeenCalled()
    expect(mocks.putPurchaseSelection).not.toHaveBeenCalled()
    expect(mocks.startCheckout).not.toHaveBeenCalled()
    expect(mocks.reportCheckoutOutcome).not.toHaveBeenCalled()
    expect(mocks.purchase).not.toHaveBeenCalled()
  })

  it("keeps the durable attempt ambiguous after a network failure", async () => {
    mocks.purchase.mockRejectedValue({
      code: "10",
      underlyingErrorMessage: "private receipt payload",
    })
    const { result } = setup()
    await act(async () => {
      await expect(result.current.mutateAsync(purchase)).resolves.toEqual({ status: "CONFIRMATION_AMBIGUOUS" })
    })
    expect(mocks.reportCheckoutOutcome).toHaveBeenCalledWith("attempt-1", "CONFIRMATION_AMBIGUOUS")
  })

  it("does not encourage a retry when the store confirmed before identity changed", async () => {
    mocks.purchase.mockRejectedValue(new RevenueCatRuntimeError(
      "PURCHASE_CONFIRMED_IDENTITY_CHANGED",
      "private provider details",
    ))
    const { result, invalidate } = setup()
    await act(async () => {
      await expect(result.current.mutateAsync(purchase)).resolves.toEqual({
        status: "CONFIRMATION_AMBIGUOUS",
      })
    })
    expect(invalidate).toHaveBeenCalledTimes(4)
  })

  it("does not replace a confirmed SDK outcome when backend sync fails", async () => {
    mocks.purchase.mockResolvedValue(undefined)
    mocks.sync.mockRejectedValue(new Error("sync unavailable"))
    const { result } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(purchase)).resolves.toEqual({ status: "SDK_CONFIRMED" })
    })
    expect(mocks.reportCheckoutOutcome).toHaveBeenCalledTimes(1)
    expect(mocks.reportCheckoutOutcome).toHaveBeenCalledWith("attempt-1", "SDK_CONFIRMED")
  })

  it("returns an ambiguous outcome when reporting fails after native I/O", async () => {
    mocks.purchase.mockResolvedValue(undefined)
    mocks.reportCheckoutOutcome.mockRejectedValue(new Error("backend unavailable"))
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(purchase)).resolves.toEqual({
        status: "CONFIRMATION_AMBIGUOUS",
      })
    })
    expect(mocks.sync).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledTimes(4)
  })

  it.each(["CANCELED", "OWNERSHIP_CONFLICT"] as const)(
    "invalidates durable checkout state after %s",
    async (status) => {
      mocks.purchase.mockRejectedValue({ code: status === "CANCELED" ? "1" : "13" })
      const { result, invalidate } = setup()

      await act(async () => {
        await expect(result.current.mutateAsync(purchase)).resolves.toEqual({ status })
      })
      expect(invalidate).toHaveBeenCalledTimes(4)
    },
  )

  it("prevents two concurrent purchase attempts", async () => {
    let resolvePurchase!: () => void
    mocks.purchase.mockReturnValue(new Promise<void>((resolve) => { resolvePurchase = resolve }))
    const { result } = setup()
    let first!: Promise<unknown>
    await act(async () => {
      first = result.current.mutateAsync(purchase)
      await expect(result.current.mutateAsync(purchase)).rejects.toMatchObject({ code: "IN_PROGRESS" })
      resolvePurchase()
      await first
    })
    expect(mocks.purchase).toHaveBeenCalledOnce()
  })
})
