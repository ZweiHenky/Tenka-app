// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useJornadaGeneration } from "../useJornadaGeneration"

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  prepareJornadaSlots: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  getDivision: vi.fn(),
  getAvailability: vi.fn(),
  plan: vi.fn(),
  store: {
    schedules: {} as Record<string, any>,
    habilitados: {} as Record<string, string[]>,
    guardarProgramacion: vi.fn(),
    advanceSchedule: vi.fn(),
    clearExtraSlots: vi.fn(),
    clearEliminatoriaSlots: vi.fn(),
    replaceSlots: vi.fn(),
    setHabilitados: vi.fn(),
  },
}))

vi.mock("@/features/jornada/hooks/useJornadas", () => ({
  useGenerateNextJornada: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}))
vi.mock("@/stores/divisionSchedule", () => ({
  useDivisionScheduleStore: (selector: (state: typeof mocks.store) => unknown) => selector(mocks.store),
  getActiveSlots: (slots: unknown[]) => slots,
}))
vi.mock("@/features/division/utils/prepareJornadaSlots", () => ({
  prepareJornadaSlots: mocks.prepareJornadaSlots,
}))
vi.mock("@/features/division/api/divisions", () => ({ divisionApi: { getById: mocks.getDivision } }))
vi.mock("@/features/court-availability/api/courtAvailability", () => ({ courtAvailabilityApi: { get: mocks.getAvailability } }))
vi.mock("@/features/court-availability/planner", () => ({ planFromAvailability: mocks.plan }))
vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({ info: mocks.info, error: mocks.error, success: mocks.success }),
}))

const divisionId = "division"
const preparedSlots = [{ id: "prepared", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00" }]

function renderGeneration(options?: { ligaCompletada?: boolean; playoffMode?: boolean; faseLiga?: boolean }) {
  const onGenerated = vi.fn()
  const hook = renderHook(() => useJornadaGeneration({
    divisionId,
    leagueId: "league-1",
    ligaCompletada: options?.ligaCompletada ?? false,
    playoffMode: options?.playoffMode ?? false,
    faseLiga: options?.faseLiga ?? true,
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
    mocks.getDivision.mockResolvedValue({ ligaId: "league" })
    mocks.getAvailability.mockResolvedValue({ mode: "SINGLE", canchas: [], ocupaciones: [] })
    mocks.plan.mockImplementation((slots) => ({ slots, conflicts: [], unassignedSlotIds: [] }))
    mocks.mutateAsync.mockResolvedValue({ fechaInicio: "2026-07-27" })
  })

  it("blocks generation when the season is completed", () => {
    const { result } = renderGeneration({ ligaCompletada: true })

    act(() => { result.current.handleGenerateJornada() })

    expect(mocks.info).toHaveBeenCalledWith("Temporada completada. Reinicia la división para continuar.")
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
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
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  // En un cuadro puro los equipos los decide el bracket: nadie habilita equipos, y exigirlos
  // dejaba la jornada imposible de generar.
  describe("sin fase de liga", () => {
    const bracketSlot = { id: "elim-p1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "eliminatoria", partidoId: "p1" }

    beforeEach(() => {
      mocks.store.schedules = { [divisionId]: { slots: [bracketSlot] } }
      mocks.store.habilitados = {}
    })

    it("genera la jornada sin ningún equipo habilitado", async () => {
      const { result } = renderGeneration({ faseLiga: false, playoffMode: true })

      await act(async () => { await result.current.handleGenerateJornada() })

      expect(mocks.error).not.toHaveBeenCalled()
      expect(mocks.mutateAsync).toHaveBeenCalledTimes(1)
    })

    // Mandar [] lo rechaza el backend con min(2); omitirlo significa "todos los equipos de la
    // división", y el fallo no se vería hasta la request.
    it("omite equipoIds en vez de mandar un arreglo vacío", async () => {
      const { result } = renderGeneration({ faseLiga: false, playoffMode: true })

      await act(async () => { await result.current.handleGenerateJornada() })

      expect(mocks.mutateAsync.mock.calls[0][0].equipoIds).toBeUndefined()
    })

    it("pide programar el cuadro cuando no hay slots, no marcar equipos", () => {
      mocks.store.schedules = { [divisionId]: { slots: [] } }
      const { result } = renderGeneration({ faseLiga: false, playoffMode: true })

      act(() => { result.current.handleGenerateJornada() })

      expect(mocks.error).toHaveBeenCalledWith("Programa al menos un partido del cuadro antes de generar la jornada")
      expect(mocks.mutateAsync).not.toHaveBeenCalled()
    })
  })

  it("con fase de liga sigue mandando los equipos habilitados", async () => {
    mocks.store.habilitados = { [divisionId]: ["a", "b"] }
    const { result } = renderGeneration()

    await act(async () => { await result.current.handleGenerateJornada() })

    expect(mocks.mutateAsync.mock.calls[0][0].equipoIds).toEqual(["a", "b"])
  })

  it("still requires a resting team when an odd schedule only has a friendly", () => {
    mocks.store.habilitados = { [divisionId]: ["a", "b", "c"] }
    mocks.store.schedules[divisionId] = {
      slots: [{ id: "extra-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "amistoso" }],
    }
    const { result } = renderGeneration()

    act(() => { result.current.handleGenerateJornada() })

    expect(mocks.error).toHaveBeenCalledWith("Selecciona qué equipo descansa antes de generar la jornada")
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  it("allows an odd schedule with a complemento slot", async () => {
    mocks.store.habilitados = { [divisionId]: ["a", "b", "c"] }
    mocks.store.schedules[divisionId] = {
      slots: [{ id: "extra-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "complemento", equipoLocalId: "c", equipoVisitanteId: "a" }],
    }
    const { result } = renderGeneration()

    await act(async () => { await result.current.handleGenerateJornada() })

    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      { divisionId, leagueId: "league-1", slots: preparedSlots, equipoIds: ["a", "b", "c"], descansoEquipoId: undefined, idempotencyKey: expect.stringMatching(/^jornada-/) },
    )
  })

  it("requires the Sin puntos team in a complemento", () => {
    mocks.store.habilitados = { [divisionId]: ["a", "b", "c"] }
    mocks.store.schedules[divisionId] = {
      slots: [{ id: "extra-1", fecha: "2026-07-27", horaInicio: "08:00", horaFin: "09:00", tipo: "complemento", equipoLocalId: "c" }],
    }
    const { result } = renderGeneration()

    act(() => { result.current.handleGenerateJornada() })

    expect(mocks.error).toHaveBeenCalledWith("Asigna el equipo que repetirá partido sin puntos en el complemento")
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  it("reuses the idempotency key while the generation payload is unchanged", async () => {
    mocks.mutateAsync.mockRejectedValue(new Error("retry"))
    const { result } = renderGeneration()

    await act(async () => { await result.current.handleGenerateJornada() })
    await act(async () => { await result.current.handleGenerateJornada() })

    expect(mocks.mutateAsync).toHaveBeenCalledTimes(2)
    expect(mocks.mutateAsync.mock.calls[1][0].idempotencyKey).toBe(mocks.mutateAsync.mock.calls[0][0].idempotencyKey)
  })

  it("updates the schedule after a successful generation and reports errors", async () => {
    const { result, onGenerated } = renderGeneration()
    await act(async () => { await result.current.handleGenerateJornada() })

    expect(mocks.store.guardarProgramacion).toHaveBeenCalledWith(divisionId)
    expect(mocks.store.clearExtraSlots).toHaveBeenCalledWith(divisionId)
    expect(mocks.store.clearEliminatoriaSlots).toHaveBeenCalledWith(divisionId, [])
    expect(mocks.store.advanceSchedule).toHaveBeenCalledWith(divisionId, "2026-07-27", { faseLiga: true })
    expect(mocks.store.setHabilitados).toHaveBeenCalledWith(divisionId, [])
    expect(onGenerated).toHaveBeenCalledOnce()
    expect(mocks.success).toHaveBeenCalledWith("Jornada generada")

    mocks.mutateAsync.mockRejectedValueOnce(new Error("falló"))
    await act(async () => { await result.current.handleGenerateJornada() })
    expect(mocks.error).toHaveBeenCalledWith("falló")
  })

  it("clears only the eliminatoria matches submitted in the generated jornada", async () => {
    mocks.store.schedules[divisionId] = {
      slots: [{ id: "elim-semi-1", fecha: "2026-07-27", horaInicio: "10:00", horaFin: "11:00", tipo: "eliminatoria", partidoId: "semi-1" }],
    }
    mocks.prepareJornadaSlots.mockReturnValue([
      { fecha: "2026-07-27", horaInicio: "10:00", horaFin: "11:00", tipo: "eliminatoria", partidoId: "semi-1" },
    ])
    const { result } = renderGeneration({ playoffMode: true })

    await act(async () => { await result.current.handleGenerateJornada() })

    expect(mocks.store.clearEliminatoriaSlots).toHaveBeenCalledWith(divisionId, ["semi-1"])
  })
})
