// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { billingKeys } from "./queryKeys"
import { useBillingOfferings } from "./useBillingOfferings"
import type { BillingCatalog } from "../types"

const mocks = vi.hoisted(() => ({
  attach: vi.fn(),
  getOfferings: vi.fn(),
  mapBillingOfferings: vi.fn(),
  platform: "ios",
}))

vi.mock("react-native", () => ({
  Platform: { get OS() { return mocks.platform } },
}))
vi.mock("@/infrastructure/billing/revenueCatNative", () => ({
  revenueCatClient: { attach: mocks.attach, getOfferings: mocks.getOfferings },
}))
vi.mock("@/features/billing/offerings", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/billing/offerings")>()
  return { ...original, mapBillingOfferings: mocks.mapBillingOfferings }
})

const catalog: BillingCatalog = {
  available: true,
  environment: "PREVIEW",
  release: { id: "release-1", version: "2026-09-mx-v1", products: [] },
  purchasesEnabled: false,
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe("useBillingOfferings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.platform = "ios"
    mocks.attach.mockResolvedValue({ status: "READY", appUserId: "billing_account-a" })
    mocks.getOfferings.mockResolvedValue({ all: {}, current: null })
    mocks.mapBillingOfferings.mockReturnValue({ store: "APPLE", capacities: [] })
  })

  it.each([
    ["missing identity", { appUserId: null, catalog, role: "LIGA" as const }],
    ["missing catalog", { appUserId: "billing_account-a", catalog: null, role: "LIGA" as const }],
    ["captain role", { appUserId: "billing_account-a", catalog, role: "CAPITAN" as const }],
  ])("does not query with %s", (_label, input) => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useBillingOfferings(input), { wrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mocks.attach).not.toHaveBeenCalled()
  })

  it("does not query on web", () => {
    mocks.platform = "web"
    const { wrapper } = setup()
    const { result } = renderHook(() => useBillingOfferings({
      appUserId: "billing_account-a",
      catalog,
      role: "LIGA",
    }), { wrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mocks.attach).not.toHaveBeenCalled()
  })

  it("attaches before reading and maps Offerings even while purchases are disabled", async () => {
    const mapped = { store: "APPLE", capacities: [{ capacity: 2 }] }
    mocks.mapBillingOfferings.mockReturnValue(mapped)
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useBillingOfferings({
      appUserId: "billing_account-a",
      catalog,
      role: "LIGA",
    }), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mapped))
    expect(mocks.attach).toHaveBeenCalledWith("billing_account-a")
    expect(mocks.getOfferings).toHaveBeenCalledWith("billing_account-a")
    expect(mocks.attach.mock.invocationCallOrder[0]).toBeLessThan(mocks.getOfferings.mock.invocationCallOrder[0])
    expect(mocks.mapBillingOfferings).toHaveBeenCalledWith({
      ...catalog,
      purchasesEnabled: false,
    }, { all: {}, current: null }, "ios")
    expect(client.getQueryData(billingKeys.offerings(
      "billing_account-a",
      "2026-09-mx-v1",
      "ios",
      "PREVIEW",
    ))).toEqual(mapped)
  })

  it("does not reuse an identity's cache entry for another account", async () => {
    const { client, wrapper } = setup()
    const view = renderHook(
      ({ appUserId }) => useBillingOfferings({ appUserId, catalog, role: "LIGA" }),
      { initialProps: { appUserId: "billing_account-a" }, wrapper },
    )
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true))

    mocks.attach.mockResolvedValue({ status: "READY", appUserId: "billing_account-b" })
    view.rerender({ appUserId: "billing_account-b" })
    await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith("billing_account-b"))

    expect(client.getQueryData(billingKeys.offerings(
      "billing_account-a",
      "2026-09-mx-v1",
      "ios",
      "PREVIEW",
    ))).toBeDefined()
    expect(client.getQueryData(billingKeys.offerings(
      "billing_account-b",
      "2026-09-mx-v1",
      "ios",
      "PREVIEW",
    ))).toBeDefined()
  })
})
