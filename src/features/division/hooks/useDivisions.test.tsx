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

  it("writes known reset state and only refetches non-derivable views", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useResetDivision(), { wrapper })
    queryClient.setQueryData(["jornadas", "division-1"], [{ id: "jornada-1", partidos: [] }])
    queryClient.setQueryData(["rondas-playoff", "division-1"], [{ id: "ronda-1", partidos: [] }])

    await act(async () => {
      await result.current.mutateAsync({ divisionId: "division-1", leagueId: "league-1" })
    })

    expect(queryClient.getQueryData(["jornadas", "division-1"])).toEqual([])
    expect(queryClient.getQueryData(["rondas-playoff", "division-1"])).toEqual([])
    expect(queryClient.getQueryData(["last-jornada", "division-1"])).toBeNull()
    expect(queryClient.getQueryData(["goleadores", "division-1"])).toEqual({ rows: [], unattributedGoals: 0 })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tabla-posiciones", "division-1"], exact: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["referee-candidates", "league-1"], exact: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["division", "division-1"], exact: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["divisions", "league-1"], exact: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["leagues", "league-1"], exact: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ligas-infinitas"], refetchType: "none" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["account-quota"] })
  })
})
