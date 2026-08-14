// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useRefereeLinkStatus, useUpdatePartido, useUpdatePartidoResult } from "./usePartidos"

const mocks = vi.hoisted(() => ({ getRefereeLinkStatus: vi.fn(), update: vi.fn(), updateResult: vi.fn() }))

vi.mock("../api/partidos", () => ({
  partidoApi: { getRefereeLinkStatus: mocks.getRefereeLinkStatus, update: mocks.update, updateResult: mocks.updateResult },
}))

afterEach(() => vi.useRealTimers())

describe("useRefereeLinkStatus", () => {
  it("waits until the referee UI is relevant and does not poll an absent link", async () => {
    vi.useFakeTimers()
    mocks.getRefereeLinkStatus.mockResolvedValue({ exists: false, expiresAt: null })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { rerender } = renderHook(({ enabled }) => useRefereeLinkStatus("partido-1", enabled), { initialProps: { enabled: false }, wrapper })

    expect(mocks.getRefereeLinkStatus).not.toHaveBeenCalled()

    rerender({ enabled: true })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(mocks.getRefereeLinkStatus).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(mocks.getRefereeLinkStatus).toHaveBeenCalledTimes(1)
  })
})

describe("useUpdatePartido", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ id: "partido-1", estado: "FINALIZADO" })
  })

  it("invalidates the jornada list that owns the progress counter", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useUpdatePartido(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        id: "partido-1",
        divisionId: "division-1",
        estado: "FINALIZADO",
      })
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jornadas", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jornadas-infinitas", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tabla-posiciones", "division-1"] })
  })

  it("does not invalidate a malformed division key when none is provided", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useUpdatePartido(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: "partido-1", estado: "FINALIZADO" })
    })

    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["jornadas", undefined] })
  })
})

describe("useUpdatePartidoResult", () => {
  it("uses the dedicated endpoint payload and invalidates goleadores", async () => {
    mocks.updateResult.mockResolvedValue({ id: "partido-1", estado: "FINALIZADO" })
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useUpdatePartidoResult(), { wrapper })
    const payload = { id: "partido-1", divisionId: "division-1", expectedVersion: 4, estado: "FINALIZADO", golesLocal: 2, golesVisitante: 1, allocations: [{ ladoMarcador: "LOCAL" as const, jugadorId: "player-1", cantidad: 2 }] }

    await act(async () => { await result.current.mutateAsync(payload) })

    expect(mocks.updateResult).toHaveBeenCalledWith("partido-1", expect.objectContaining({ expectedVersion: 4, allocations: payload.allocations }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["goleadores", "division-1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["rondas-playoff", "division-1"] })
  })
})
