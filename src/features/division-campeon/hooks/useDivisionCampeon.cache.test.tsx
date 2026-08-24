// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDeleteRondasByDivision, useGenerateRondas } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import { useResetDivision } from "@/features/division/hooks/useDivisions"

const mocks = vi.hoisted(() => ({ deleteByDivision: vi.fn(), generate: vi.fn(), reset: vi.fn(), resetSchedule: vi.fn() }))
// El store persiste en AsyncStorage; importarlo de verdad arrastra expo-modules-core al runner.
vi.mock("@/stores/divisionSchedule", () => ({
  useDivisionScheduleStore: { getState: () => ({ resetSchedule: mocks.resetSchedule }) },
}))
vi.mock("@/features/ronda-playoff/api/rondasPlayoff", () => ({
  rondaPlayoffApi: { deleteByDivision: mocks.deleteByDivision, generate: mocks.generate },
}))
vi.mock("@/features/division/api/divisions", () => ({
  divisionApi: { reset: mocks.reset },
}))

const campeon = { id: "c1", divisionId: "d1", equipoId: "e1", equipoNombre: "Cuauhtémoc" }

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  client.setQueryData(["division-campeon", "d1"], campeon)
  return { client, wrapper }
}

describe("el título se archiva al empezar otra temporada", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteByDivision.mockResolvedValue(undefined)
    mocks.generate.mockResolvedValue([])
    mocks.reset.mockResolvedValue(undefined)
  })

  // Borrar el cuadro **no** toca el título: sigue vigente para que el dueño lo pueda corregir con
  // "Quitar campeón". Archivarlo ahí lo volvería irreversible.
  it("borrar las eliminatorias deja el campeón intacto", async () => {
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useDeleteRondasByDivision(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ divisionId: "d1", leagueId: "l1" }) })

    expect(client.getQueryData(["division-campeon", "d1"])).toMatchObject({ id: "c1" })
  })

  // Un cuadro nuevo es una temporada nueva: el servidor archiva el vigente, así que el banner
  // tiene que limpiarse o mostraría al campeón viejo durante toda la temporada siguiente.
  it("generar un cuadro nuevo limpia el campeón de la caché", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["campeones-historial", "d1"], [])
    const { result } = renderHook(() => useGenerateRondas(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ divisionId: "d1", cantidadEquipos: 4, leagueId: "l1" }) })

    expect(client.getQueryData(["division-campeon", "d1"])).toBeNull()
    expect(client.getQueryState(["campeones-historial", "d1"])?.isInvalidated).toBe(true)
  })

  it("reiniciar la división también lo quita", async () => {
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useResetDivision(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ divisionId: "d1", leagueId: "l1" }) })

    expect(client.getQueryData(["division-campeon", "d1"])).toBeNull()
  })

  // Dirigido: el campeón de otra división no se toca.
  it("no toca el campeón de otra división", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["division-campeon", "d2"], { ...campeon, divisionId: "d2" })
    const { result } = renderHook(() => useDeleteRondasByDivision(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ divisionId: "d1", leagueId: "l1" }) })

    expect(client.getQueryData(["division-campeon", "d2"])).toMatchObject({ divisionId: "d2" })
  })
})
