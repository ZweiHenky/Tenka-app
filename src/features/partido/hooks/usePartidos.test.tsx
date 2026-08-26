// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { refereeLinkExpiryRefetchInterval, useCreateJornadaPartido, useCreateRefereeLink, useRefereeLinkStatus, useRevokeRefereeLink, useUpdatePartido, useUpdatePartidoResult } from "./usePartidos"

const mocks = vi.hoisted(() => ({ getRefereeLinkStatus: vi.fn(), update: vi.fn(), updateResult: vi.fn(), createInJornada: vi.fn(), createRefereeLink: vi.fn(), revokeRefereeLink: vi.fn() }))

vi.mock("../api/partidos", () => ({
  partidoApi: { getRefereeLinkStatus: mocks.getRefereeLinkStatus, update: mocks.update, updateResult: mocks.updateResult, createInJornada: mocks.createInJornada, createRefereeLink: mocks.createRefereeLink, revokeRefereeLink: mocks.revokeRefereeLink },
}))

afterEach(() => vi.useRealTimers())

describe("useRefereeLinkStatus", () => {
  it("schedules one refresh at expiration instead of polling every 30 seconds", () => {
    const now = Date.parse("2026-08-14T12:00:00Z")
    expect(refereeLinkExpiryRefetchInterval({ exists: true, expiresAt: "2026-08-14T12:02:00Z" }, now)).toBe(121_000)
    expect(refereeLinkExpiryRefetchInterval({ exists: false, expiresAt: null }, now)).toBe(false)
    expect(refereeLinkExpiryRefetchInterval({ exists: true, expiresAt: "2026-08-14T11:59:00Z" }, now)).toBe(1_000)
  })

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

describe("referee link mutations", () => {
  it("writes create and revoke status directly without refetching", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    mocks.createRefereeLink.mockResolvedValue({ token: "token", url: "https://example.test", expiresAt: "2026-08-14T13:00:00Z" })
    mocks.revokeRefereeLink.mockResolvedValue(undefined)
    const create = renderHook(() => useCreateRefereeLink(), { wrapper })
    const revoke = renderHook(() => useRevokeRefereeLink(), { wrapper })

    await act(async () => { await create.result.current.mutateAsync("partido-1") })
    expect(queryClient.getQueryData(["referee-link-status", "partido-1"])).toEqual({ exists: true, expiresAt: "2026-08-14T13:00:00Z" })

    await act(async () => { await revoke.result.current.mutateAsync("partido-1") })
    expect(queryClient.getQueryData(["referee-link-status", "partido-1"])).toEqual({ exists: false, expiresAt: null })
    expect(invalidate).not.toHaveBeenCalled()
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
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["tabla-posiciones", "division-1"] }))
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["rondas-playoff", "division-1"] }))
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
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["goleadores", "division-1"], exact: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["account-quota"] })
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["rondas-playoff", "division-1"] }))
  })

  it("skips standings and scorers when neither state contributes", async () => {
    mocks.updateResult.mockResolvedValue({ id: "partido-1", estado: "SUSPENDIDO", jornadaId: "jornada-1", rondaPlayoffId: null, tipoPartido: "REGULAR" })
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useUpdatePartidoResult(), { wrapper })

    await act(async () => { await result.current.mutateAsync({
      id: "partido-1", divisionId: "division-1", expectedVersion: 1, estado: "SUSPENDIDO", golesLocal: 0, golesVisitante: 0, allocations: [],
      previous: { estado: "PROGRAMADO", tipoPartido: "REGULAR", jornadaId: "jornada-1", rondaPlayoffId: null },
    }) })

    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["tabla-posiciones", "division-1"] }))
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["goleadores", "division-1"] }))
  })
})

describe("useCreateJornadaPartido", () => {
  it("patches jornada projections and removes stale creation options", async () => {
    const partido = { id: "p2", jornadaId: "j1", fecha: "2026-08-14T12:00:00Z", fechaFin: "2026-08-14T13:00:00Z", golesLocal: 0, golesVisitante: 0, estado: "PROGRAMADO", llave: null, rondaPlayoffId: null, equipoLocalId: "a", equipoVisitanteId: "b", canchaId: null }
    const jornada = { id: "j1", numero: 1, divisionId: "d1", fechaInicio: null, fechaFin: null, partidos: [] }
    mocks.createInJornada.mockResolvedValue(partido)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    queryClient.setQueryData(["jornada", "j1"], jornada)
    queryClient.setQueryData(["jornadas", "d1"], [jornada])
    queryClient.setQueryData(["jornada-partido-options", "j1"], { equipos: [] })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useCreateJornadaPartido(), { wrapper })

    await act(async () => { await result.current.mutateAsync({
      jornadaId: "j1", divisionId: "d1", leagueId: "l1", idempotencyKey: "key",
      data: { equipoLocalId: "a", equipoVisitanteId: "b", tipoPartido: "REGULAR", fecha: "2026-08-14", horaInicio: "12:00", horaFin: "13:00", canchaId: null },
    }) })

    expect(queryClient.getQueryData<any>(["jornada", "j1"])?.partidos).toEqual([partido])
    expect(queryClient.getQueryData<any[]>(["jornadas", "d1"])?.[0].partidos).toEqual([partido])
    expect(queryClient.getQueryData(["jornada-partido-options", "j1"])).toBeUndefined()
  })
})
