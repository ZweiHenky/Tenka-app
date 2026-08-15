import { beforeEach, describe, expect, it, vi } from "vitest"
import { rondaPlayoffApi } from "./rondasPlayoff"

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock("@/infrastructure/api/client", () => ({ api: mocks }))

const rounds = [{
  id: "round-1",
  nombre: "Final",
  orden: 1,
  divisionId: "division-1",
  createdAt: "2026-08-14",
  updatedAt: "2026-08-14",
  partidos: [{ id: "match-1" }],
}]

describe("rondaPlayoffApi.generate", () => {
  beforeEach(() => vi.clearAllMocks())

  it("loads the canonical hydrated rounds after a successful POST", async () => {
    mocks.post.mockResolvedValue({ data: { success: true, data: [{ id: "round-1" }] } })
    mocks.get.mockResolvedValue({ data: { success: true, data: rounds } })

    await expect(rondaPlayoffApi.generate({ divisionId: "division-1", cantidadEquipos: 2 })).resolves.toEqual(rounds)

    expect(mocks.post).toHaveBeenCalledOnce()
    expect(mocks.get).toHaveBeenCalledWith("/api/rondas-playoff/division/division-1")
  })

  it("reconciles a lost POST response without repeating the write", async () => {
    mocks.post.mockRejectedValue(new Error("Network Error"))
    mocks.get.mockResolvedValue({ data: { success: true, data: rounds } })

    await expect(rondaPlayoffApi.generate({ divisionId: "division-1", cantidadEquipos: 2 })).resolves.toEqual(rounds)

    expect(mocks.post).toHaveBeenCalledOnce()
    expect(mocks.get).toHaveBeenCalledOnce()
  })

  it("does not hide an HTTP error or retry the POST", async () => {
    const conflict = Object.assign(new Error("Ya existen eliminatorias"), { response: { status: 409 } })
    mocks.post.mockRejectedValue(conflict)

    await expect(rondaPlayoffApi.generate({ divisionId: "division-1", cantidadEquipos: 2 })).rejects.toBe(conflict)

    expect(mocks.post).toHaveBeenCalledOnce()
    expect(mocks.get).not.toHaveBeenCalled()
  })
})
