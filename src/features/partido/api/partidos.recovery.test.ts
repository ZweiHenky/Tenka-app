import { beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("@/infrastructure/api/client", () => ({ api }))

// eslint-disable-next-line import/first
import { partidoApi, type UpdateResultInput } from "./partidos"

describe("partidoApi ambiguous write recovery", () => {
  beforeEach(() => vi.clearAllMocks())

  it("confirms a committed result without repeating the PATCH", async () => {
    const input: UpdateResultInput = {
      expectedVersion: 3,
      estado: "FINALIZADO",
      golesLocal: 2,
      golesVisitante: 1,
      penalesLocal: null,
      penalesVisitante: null,
      allocations: [{ ladoMarcador: "LOCAL", jugadorId: "player-1", cantidad: 2 }],
      notas: "Final",
    }
    const canonical = {
      id: "match-1",
      version: 4,
      estado: "FINALIZADO",
      golesLocal: 2,
      golesVisitante: 1,
      penalesLocal: null,
      penalesVisitante: null,
      notas: "Final",
      anotaciones: [{ ladoMarcador: "LOCAL", jugadorId: "player-1", cantidad: 2 }],
    }
    api.patch.mockRejectedValue({ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error", request: {} })
    api.get.mockResolvedValue({ data: { success: true, data: canonical } })

    await expect(partidoApi.updateResult("match-1", input)).resolves.toBe(canonical)
    expect(api.patch).toHaveBeenCalledOnce()
    expect(api.get).toHaveBeenCalledOnce()
    expect(api.get).toHaveBeenCalledWith("/api/partidos/match-1")
  })

  it("does not reconcile a version conflict", async () => {
    const error = { isAxiosError: true, code: "ERR_BAD_REQUEST", response: { status: 409 } }
    api.patch.mockRejectedValue(error)

    await expect(partidoApi.updateResult("match-1", {
      expectedVersion: 3,
      estado: "SUSPENDIDO",
      golesLocal: 0,
      golesVisitante: 0,
      allocations: [],
    })).rejects.toBe(error)
    expect(api.get).not.toHaveBeenCalled()
  })
})
