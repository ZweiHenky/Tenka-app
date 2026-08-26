import { beforeEach, describe, expect, it, vi } from "vitest"
import { divisionEquipoApi } from "./division-equipo"

const mocks = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock("@/infrastructure/api/client", () => ({
  api: { post: mocks.post },
}))

describe("divisionEquipoApi.replace", () => {
  beforeEach(() => vi.clearAllMocks())

  it("posts the strict replacement body to the replacement route", async () => {
    const response = {
      divisionId: "division",
      equipoId: "new",
      equipo: { id: "new", nombre: "Nuevo", logo: null, codigo: "NEW", esPropio: false },
      equipoReemplazadoId: "old",
      partidosActualizados: 4,
    }
    mocks.post.mockResolvedValue({ data: { success: true, data: response } })

    await expect(divisionEquipoApi.replace("division", "old", "new")).resolves.toEqual(response)
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/divisiones-equipos/division/old/reemplazo",
      { equipoNuevoId: "new" },
    )
  })
})
