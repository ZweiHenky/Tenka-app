// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDeleteRondasByDivision } from "./useRondasPlayoff"

const mocks = vi.hoisted(() => ({ deleteByDivision: vi.fn() }))
vi.mock("@/features/ronda-playoff/api/rondasPlayoff", () => ({
  rondaPlayoffApi: { deleteByDivision: mocks.deleteByDivision },
}))

const ronda = {
  id: "r1",
  nombre: "Final",
  orden: 1,
  divisionId: "d1",
  createdAt: "",
  updatedAt: "",
  partidos: [{ id: "elim-1" }, { id: "elim-2" }],
}

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe("borrar las eliminatorias", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteByDivision.mockResolvedValue(undefined)
  })

  // El servidor borra además las jornadas que quedaron sin partidos. Con el staleTime de 5 minutos,
  // sin invalidarlas la app las seguiría mostrando en Jornadas y en el Horario público.
  it("invalida las jornadas de la división", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["jornadas", "d1"], [{ id: "j1" }])
    client.setQueryData(["jornadas-infinitas", "d1"], { pages: [{ rows: [{ id: "j1" }], total: 1, page: 1, limit: 4 }], pageParams: [1] })
    client.setQueryData(["last-jornada", "d1"], { id: "j1" })
    const { result } = renderHook(() => useDeleteRondasByDivision(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ divisionId: "d1", leagueId: "l1" }) })

    expect(client.getQueryState(["jornadas", "d1"])?.isInvalidated).toBe(true)
    expect(client.getQueryState(["jornadas-infinitas", "d1"])?.isInvalidated).toBe(true)
    expect(client.getQueryState(["last-jornada", "d1"])?.isInvalidated).toBe(true)
  })

  it("descarta de la caché los partidos del cuadro borrado", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["rondas-playoff", "d1"], [ronda])
    client.setQueryData(["partido", "elim-1"], { id: "elim-1" })
    client.setQueryData(["partido", "ajeno"], { id: "ajeno" })
    const { result } = renderHook(() => useDeleteRondasByDivision(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ divisionId: "d1", leagueId: "l1" }) })

    expect(client.getQueryData(["partido", "elim-1"])).toBeUndefined()
    // Dirigido: un partido ajeno que estaba en caché no se toca.
    expect(client.getQueryData(["partido", "ajeno"])).toEqual({ id: "ajeno" })
    expect(client.getQueryData(["rondas-playoff", "d1"])).toEqual([])
  })
})
