// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useJornadaGeneration } from "../useJornadaGeneration"

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  prepareJornadaSlots: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  store: {
    schedules: {} as Record<string, any>,
    habilitados: {} as Record<string, string[]>,
    guardarProgramacion: vi.fn(),
    advanceSchedule: vi.fn(),
    clearExtraSlots: vi.fn(),
    clearEliminatoriaSlots: vi.fn(),
    setHabilitados: vi.fn(),
  },
}))

vi.mock("@/features/jornada/hooks/useJornadas", () => ({
  useGenerateNextJornada: () => ({ mutate: mocks.mutate, isPending: false }),
}))
vi.mock("@/stores/divisionSchedule", () => ({
  useDivisionScheduleStore: (selector: (state: typeof mocks.store) => unknown) => selector(mocks.store),
}))
vi.mock("@/features/division/utils/prepareJornadaSlots", () => ({
  prepareJornadaSlots: mocks.prepareJornadaSlots,
}))
vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({ info: mocks.info, error: mocks.error, success: mocks.success }),
}))

const divisionId = "division"
const preparedSlots = [{ id: "prepared", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00" }]

function renderGeneration(options?: { ligaCompletada?: boolean; playoffMode?: boolean }) {
  const onGenerated = vi.fn()
  const hook = renderHook(() => useJornadaGeneration({
    divisionId,
    ligaCompletada: options?.ligaCompletada ?? false,
    playoffMode: options?.playoffMode ?? false,
    onGenerated,
  }))
  return { ...hook, onGenerated }
}

describe("useJornadaGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.store.schedules = {
      [divisionId]: {
        slots: [{ id: "slot-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "regular" }],
        descansoEquipoId: undefined,
      },
    }
    mocks.store.habilitados = { [divisionId]: ["a", "b"] }
    mocks.prepareJornadaSlots.mockReturnValue(preparedSlots)
  })

  it("blocks generation when the season is completed", () => {
    const { result } = renderGeneration({ ligaCompletada: true })

    act(() => { result.current.handleGenerateJornada() })

    expect(mocks.info).toHaveBeenCalledWith("Temporada completada. Reinicia la división para continuar.")
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it("requires a configured schedule and at least two enabled teams", () => {
    mocks.store.schedules = {}
    const first = renderGeneration()
    act(() => { first.result.current.handleGenerateJornada() })
    expect(mocks.error).toHaveBeenCalledWith("Primero configura la programación de la jornada")

    first.unmount()
    vi.clearAllMocks()
    mocks.store.schedules = { [divisionId]: { slots: [] } }
    mocks.store.habilitados = { [divisionId]: ["a"] }
    const second = renderGeneration()
    act(() => { second.result.current.handleGenerateJornada() })
    expect(mocks.error).toHaveBeenCalledWith("Marca al menos 2 equipos que pagaron arbitraje para generar una jornada")
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it("still requires a resting team when an odd schedule only has a friendly", () => {
    mocks.store.habilitados = { [divisionId]: ["a", "b", "c"] }
    mocks.store.schedules[divisionId] = {
      slots: [{ id: "extra-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "amistoso" }],
    }
    const { result } = renderGeneration()

    act(() => { result.current.handleGenerateJornada() })

    expect(mocks.error).toHaveBeenCalledWith("Selecciona qué equipo descansa antes de generar la jornada")
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it("allows an odd schedule with a complemento slot", () => {
    mocks.store.habilitados = { [divisionId]: ["a", "b", "c"] }
    mocks.store.schedules[divisionId] = {
      slots: [{ id: "extra-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "complemento" }],
    }
    const { result } = renderGeneration()

    act(() => { result.current.handleGenerateJornada() })

    expect(mocks.mutate).toHaveBeenCalledWith(
      { divisionId, slots: preparedSlots, equipoIds: ["a", "b", "c"], descansoEquipoId: undefined },
      expect.any(Object),
    )
  })

  it("updates the schedule after a successful generation and reports errors", () => {
    const { result, onGenerated } = renderGeneration()
    act(() => { result.current.handleGenerateJornada() })
    const callbacks = mocks.mutate.mock.calls[0][1]

    act(() => { callbacks.onSuccess({ fechaInicio: "2026-07-27" }) })

    expect(mocks.store.guardarProgramacion).toHaveBeenCalledWith(divisionId)
    expect(mocks.store.clearExtraSlots).toHaveBeenCalledWith(divisionId)
    expect(mocks.store.clearEliminatoriaSlots).toHaveBeenCalledWith(divisionId)
    expect(mocks.store.advanceSchedule).toHaveBeenCalledWith(divisionId, "2026-07-27")
    expect(mocks.store.setHabilitados).toHaveBeenCalledWith(divisionId, [])
    expect(onGenerated).toHaveBeenCalledOnce()
    expect(mocks.success).toHaveBeenCalledWith("Jornada generada")

    act(() => { callbacks.onError(new Error("falló")) })
    expect(mocks.error).toHaveBeenCalledWith("falló")
  })
})
