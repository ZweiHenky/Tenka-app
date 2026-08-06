// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useResetDivision } from "./useDivisions"

const mocks = vi.hoisted(() => ({ reset: vi.fn() }))

vi.mock("@/features/division/api/divisions", () => ({
  divisionApi: { reset: mocks.reset },
}))

describe("useResetDivision", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.reset.mockResolvedValue(undefined)
  })

  it("invalidates every division view derived from deleted matches", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useResetDivision(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync("division-1")
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jornadas", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jornadas-infinitas", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tabla-posiciones", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["rondas-playoff", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["goleadores", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["last-jornada", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["partido"] })
  })
})
