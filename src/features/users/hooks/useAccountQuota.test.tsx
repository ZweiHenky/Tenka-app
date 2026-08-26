// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { accountQuotaQueryKey } from "@/features/users/quota"
import { useAccountQuota } from "./useAccountQuota"

const mocks = vi.hoisted(() => ({ getAccountQuota: vi.fn() }))

vi.mock("@/features/users/api/users", () => ({ userApi: { getAccountQuota: mocks.getAccountQuota } }))

describe("useAccountQuota", () => {
  it("uses the shared account cache key", async () => {
    const value = { role: "CAPITAN", limits: { teams: 1, leagues: 0, divisions: 0, activeDivisions: 0 }, usage: { teams: 0, leagues: 0, divisions: 0, activeDivisions: 0 } }
    mocks.getAccountQuota.mockResolvedValue(value)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

    const { result } = renderHook(() => useAccountQuota("user-1"), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(value))

    expect(queryClient.getQueryData(accountQuotaQueryKey("user-1"))).toEqual(value)
    expect(mocks.getAccountQuota).toHaveBeenCalledWith("user-1")
    expect(mocks.getAccountQuota).toHaveBeenCalledTimes(1)
  })

  it("keeps each account in a separate cache entry", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    mocks.getAccountQuota.mockResolvedValue({ role: "LIGA", limits: { teams: 40, leagues: 1, divisions: 1, activeDivisions: 1 }, usage: { teams: 0, leagues: 0, divisions: 0, activeDivisions: 0 } })

    const { result } = renderHook(() => useAccountQuota("user-2"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(accountQuotaQueryKey("user-1"))).toBeUndefined()
    expect(queryClient.getQueryData(accountQuotaQueryKey("user-2"))).toBeDefined()
  })
})
