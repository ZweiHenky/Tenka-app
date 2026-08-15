// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDeleteJornada, useGenerateNextJornada } from "./useJornadas"

const mocks = vi.hoisted(() => ({ generate: vi.fn(), detail: vi.fn(), remove: vi.fn(), syncSchedule: vi.fn() }))
vi.mock("@/features/jornada/api/jornadas", () => ({
  jornadaApi: { generateNext: mocks.generate, getById: mocks.detail, delete: mocks.remove },
}))
vi.mock("@/stores/divisionSchedule", () => ({
  useDivisionScheduleStore: { getState: () => ({ syncSchedule: mocks.syncSchedule }) },
}))

const partido = { id: "p2", jornadaId: "j2", fecha: "2026-08-15T10:00:00Z", fechaFin: "2026-08-15T11:00:00Z", golesLocal: 0, golesVisitante: 0, estado: "PROGRAMADO", llave: null, rondaPlayoffId: null, equipoLocalId: null, equipoVisitanteId: null, canchaId: null }
const j1 = { id: "j1", numero: 1, divisionId: "d1", fechaInicio: "2026-08-08", fechaFin: "2026-08-08", partidos: [] }
const j2 = { id: "j2", numero: 2, divisionId: "d1", fechaInicio: "2026-08-15", fechaFin: "2026-08-15", partidos: [partido] }

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe("jornada mutation caches", () => {
  beforeEach(() => vi.clearAllMocks())

  it("uses one detail request to install a generated jornada in every cache", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["jornadas", "d1"], [j1])
    client.setQueryData(["jornadas-infinitas", "d1"], { pages: [{ rows: [j1], total: 1, page: 1, limit: 4 }], pageParams: [1] })
    mocks.generate.mockResolvedValue({ ...j2, partidos: undefined })
    mocks.detail.mockResolvedValue(j2)
    const { result } = renderHook(() => useGenerateNextJornada(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ divisionId: "d1", leagueId: "l1", slots: [], idempotencyKey: "key" }) })

    expect(mocks.detail).toHaveBeenCalledOnce()
    expect(client.getQueryData<any[]>(["jornadas", "d1"])?.map((entry) => entry.id)).toEqual(["j2", "j1"])
    expect(client.getQueryData(["jornada", "j2"])).toEqual(j2)
    expect(client.getQueryData(["last-jornada", "d1"])).toEqual(j2)
  })

  it("removes a complete latest jornada without requesting its predecessor", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["jornadas", "d1"], [j2, j1])
    client.setQueryData(["jornadas-infinitas", "d1"], { pages: [{ rows: [j2, j1], total: 2, page: 1, limit: 4 }], pageParams: [1] })
    client.setQueryData(["jornada", "j2"], j2)
    client.setQueryData(["partido", "p2"], partido)
    mocks.remove.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteJornada(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ id: "j2", divisionId: "d1", leagueId: "l1" }) })

    expect(mocks.detail).not.toHaveBeenCalled()
    expect(client.getQueryData<any[]>(["jornadas", "d1"])?.map((entry) => entry.id)).toEqual(["j1"])
    expect(client.getQueryData<any>(["jornadas-infinitas", "d1"])?.pages[0].rows.map((entry: any) => entry.id)).toEqual(["j1"])
    expect(client.getQueryData(["last-jornada", "d1"])).toEqual(j1)
    expect(client.getQueryData(["jornada", "j2"])).toBeUndefined()
    expect(client.getQueryData(["partido", "p2"])).toBeUndefined()
    expect(mocks.syncSchedule).toHaveBeenCalledWith("d1", j1.fechaInicio)
  })
})
