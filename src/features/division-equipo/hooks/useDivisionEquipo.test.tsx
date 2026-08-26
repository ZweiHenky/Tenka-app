// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useReplaceTeam } from "./useDivisionEquipo"
import { useDivisionScheduleStore } from "@/stores/divisionSchedule"

const mocks = vi.hoisted(() => ({ replace: vi.fn(), findByDivision: vi.fn() }))

vi.mock("@/features/division-equipo/api/division-equipo", () => ({
  divisionEquipoApi: {
    replace: mocks.replace,
    findByDivision: mocks.findByDivision,
  },
}))

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe("useReplaceTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDivisionScheduleStore.setState({
      schedules: {
        division: {
          divisionId: "division",
          slots: [{ id: "slot", fecha: "2026-08-24", horaInicio: "18:00", horaFin: "19:00", equipoLocalId: "old" }],
        },
      },
      habilitados: { division: ["old"] },
      programacionGuardada: { division: true },
      hasUnsaved: false,
    })
  })

  it("calls replacement and invalidates every affected division projection", async () => {
    const response = {
      divisionId: "division",
      equipoId: "new",
      equipo: { id: "new", nombre: "Nuevo", logo: null, codigo: "NEW", esPropio: false },
      equipoReemplazadoId: "old",
      partidosActualizados: 3,
    }
    mocks.replace.mockResolvedValue(response)
    const { client, wrapper } = setup()
    const keys = [
      ["division-equipos", "division"],
      ["jornadas", "division"],
      ["jornadas-infinitas", "division"],
      ["last-jornada", "division"],
      ["tabla-posiciones", "division"],
      ["rondas-playoff", "division"],
      ["goleadores", "division"],
      ["division-campeon", "division"],
      ["campeones-historial", "division"],
    ]
    for (const key of keys) client.setQueryData(key, { seeded: true })
    const { result } = renderHook(() => useReplaceTeam(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ divisionId: "division", equipoActualId: "old", equipoNuevoId: "new" })
    })

    expect(mocks.replace).toHaveBeenCalledWith("division", "old", "new")
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    expect(useDivisionScheduleStore.getState().habilitados.division).toEqual(["new"])
    expect(useDivisionScheduleStore.getState().schedules.division.slots[0].equipoLocalId).toBe("new")
    expect(useDivisionScheduleStore.getState().programacionGuardada.division).toBe(true)
    expect(useDivisionScheduleStore.getState().hasUnsaved).toBe(false)
  })

  it("recovers an ambiguous write only after the target replaced the source", async () => {
    const target = {
      divisionId: "division",
      equipoId: "new",
      equipo: { id: "new", nombre: "Nuevo", logo: null, codigo: "NEW", esPropio: false },
    }
    mocks.replace.mockRejectedValue({ message: "Network Error", request: {} })
    mocks.findByDivision.mockResolvedValue([target])
    const { wrapper } = setup()
    const { result } = renderHook(() => useReplaceTeam(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ divisionId: "division", equipoActualId: "old", equipoNuevoId: "new" }))
        .resolves.toMatchObject({ equipoId: "new", equipoReemplazadoId: "old" })
    })

    expect(mocks.findByDivision).toHaveBeenCalledWith("division")
  })
})
