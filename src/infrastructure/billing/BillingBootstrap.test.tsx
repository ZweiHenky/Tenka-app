// @vitest-environment jsdom
import type { ReactNode } from "react"
import { act, render, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { billingKeys } from "@/features/billing/hooks/queryKeys"
import { BillingBootstrap } from "./BillingBootstrap"

const mocks = vi.hoisted(() => ({
  attach: vi.fn(),
  detach: vi.fn(),
  mutateAsync: vi.fn(),
  subscribeToCustomerInfo: vi.fn(),
  useBillingState: vi.fn(),
  useBootstrapBillingAccount: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock("@/infrastructure/auth/client", () => ({
  authClient: { useSession: mocks.useSession },
}))
vi.mock("@/features/billing/hooks/useBilling", () => ({
  useBillingState: mocks.useBillingState,
  useBootstrapBillingAccount: mocks.useBootstrapBillingAccount,
}))
vi.mock("./revenueCatNative", () => ({
  revenueCatClient: {
    attach: mocks.attach,
    detach: mocks.detach,
    subscribeToCustomerInfo: mocks.subscribeToCustomerInfo,
  },
}))

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe("BillingBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useSession.mockReturnValue({ data: null, isPending: false })
    mocks.useBillingState.mockReturnValue({ data: undefined })
    mocks.useBootstrapBillingAccount.mockReturnValue({ isPending: false, mutateAsync: mocks.mutateAsync })
    mocks.attach.mockResolvedValue({ status: "READY", appUserId: "billing_account-a" })
    mocks.subscribeToCustomerInfo.mockReturnValue(vi.fn())
  })

  it("does nothing while the authentication session is pending", () => {
    mocks.useSession.mockReturnValue({ data: null, isPending: true })
    const { wrapper } = setup()

    render(<BillingBootstrap />, { wrapper })

    expect(mocks.detach).not.toHaveBeenCalled()
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
    expect(mocks.attach).not.toHaveBeenCalled()
  })

  it("detaches and removes private billing cache without a session", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(billingKeys.state("user-a"), { revenueCatAppUserId: "billing_account-a" })
    client.setQueryData(billingKeys.catalog(), { available: true })
    client.setQueryData(
      billingKeys.offerings("billing_account-a", "v1", "ios", "PREVIEW"),
      { all: {} },
    )

    render(<BillingBootstrap />, { wrapper })

    await waitFor(() => expect(mocks.detach).toHaveBeenCalled())
    expect(client.getQueryData(billingKeys.state("user-a"))).toBeUndefined()
    expect(client.getQueryData(billingKeys.offerings("billing_account-a", "v1", "ios", "PREVIEW"))).toBeUndefined()
    expect(client.getQueryData(billingKeys.catalog())).toEqual({ available: true })
  })

  it.each(["CAPITAN", "ADMINISTRADOR"] as const)("does not attach RevenueCat for %s", async (role) => {
    mocks.useSession.mockReturnValue({ data: { user: { id: "user-a" } }, isPending: false })
    mocks.useBillingState.mockReturnValue({ data: { role, revenueCatAppUserId: null } })
    const { wrapper } = setup()

    render(<BillingBootstrap />, { wrapper })

    await waitFor(() => expect(mocks.detach).toHaveBeenCalled())
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
    expect(mocks.attach).not.toHaveBeenCalled()
  })

  it("bootstraps a LIGA identity only once", async () => {
    mocks.useSession.mockReturnValue({ data: { user: { id: "user-a" } }, isPending: false })
    mocks.useBillingState.mockReturnValue({ data: { role: "LIGA", revenueCatAppUserId: null } })
    mocks.mutateAsync.mockResolvedValue({ revenueCatAppUserId: "billing_account-a" })
    const { wrapper } = setup()
    const view = render(<BillingBootstrap />, { wrapper })

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith("user-a"))
    view.rerender(<BillingBootstrap />)

    expect(mocks.mutateAsync).toHaveBeenCalledOnce()
  })

  it("attaches a canonical identity and invalidates only its backend state", async () => {
    const unsubscribe = vi.fn()
    let customerInfoListener: (() => void) | undefined
    mocks.useSession.mockReturnValue({ data: { user: { id: "user-a" } }, isPending: false })
    mocks.useBillingState.mockReturnValue({ data: { role: "LIGA", revenueCatAppUserId: "billing_account-a" } })
    mocks.subscribeToCustomerInfo.mockImplementation((_appUserId, listener) => {
      customerInfoListener = listener
      return unsubscribe
    })
    const { client, wrapper } = setup()
    client.setQueryData(billingKeys.state("user-a"), { role: "LIGA" })
    client.setQueryData(billingKeys.state("user-b"), { role: "LIGA" })
    const view = render(<BillingBootstrap />, { wrapper })

    await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith("billing_account-a"))
    await waitFor(() => expect(customerInfoListener).toBeTypeOf("function"))
    await act(async () => { customerInfoListener?.() })

    expect(client.getQueryState(billingKeys.state("user-a"))?.isInvalidated).toBe(true)
    expect(client.getQueryState(billingKeys.state("user-b"))?.isInvalidated).toBe(false)

    view.unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(mocks.detach).toHaveBeenCalled()
  })

  it("detaches the previous identity before attaching a different account", async () => {
    let userId = "user-a"
    let appUserId = "billing_account-a"
    mocks.useSession.mockImplementation(() => ({ data: { user: { id: userId } }, isPending: false }))
    mocks.useBillingState.mockImplementation(() => ({ data: { role: "LIGA", revenueCatAppUserId: appUserId } }))
    const { wrapper } = setup()
    const view = render(<BillingBootstrap />, { wrapper })
    await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith("billing_account-a"))

    userId = "user-b"
    appUserId = "billing_account-b"
    mocks.attach.mockResolvedValue({ status: "READY", appUserId })
    view.rerender(<BillingBootstrap />)

    await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith("billing_account-b"))
    expect(mocks.detach).toHaveBeenCalled()
  })

  it("contains bootstrap and RevenueCat failures without breaking the layout", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    mocks.useSession.mockReturnValue({ data: { user: { id: "user-a" } }, isPending: false })
    mocks.useBillingState.mockReturnValue({ data: { role: "LIGA", revenueCatAppUserId: null } })
    mocks.mutateAsync.mockRejectedValue({ code: "NETWORK_ERROR", details: { private: true } })
    const { wrapper } = setup()

    const view = render(<BillingBootstrap />, { wrapper })

    await waitFor(() => expect(warning).toHaveBeenCalledWith(
      "[RevenueCat] billing identity bootstrap failed",
      "NETWORK_ERROR",
    ))
    expect(view.container.childElementCount).toBe(0)
    warning.mockRestore()
  })
})
