import { describe, expect, it } from "vitest"
import type { InfiniteData } from "@tanstack/react-query"
import type { JornadaPage, JornadaResponse, PartidoResponse } from "./api/jornadas"
import { insertGeneratedJornada, insertGeneratedJornadaInInfinite, patchPartidoInInfinite, patchPartidoInJornadas, removeJornadaFromInfinite } from "./jornadaCache"

const partido = (id: string, jornadaId: string, fecha: string): PartidoResponse => ({
  id, jornadaId, fecha, fechaFin: fecha, golesLocal: 0, golesVisitante: 0, estado: "PROGRAMADO", llave: null,
  rondaPlayoffId: null, equipoLocalId: null, equipoVisitanteId: null, canchaId: null,
})
const jornada = (numero: number, partidos: PartidoResponse[] = []): JornadaResponse => ({
  id: `j${numero}`, numero, divisionId: "d1", fechaInicio: null, fechaFin: null, partidos,
})

describe("jornada cache helpers", () => {
  it("prepends a generated jornada and preserves finite and paginated limits", () => {
    expect(insertGeneratedJornada([jornada(2), jornada(1)], jornada(3))?.map((entry) => entry.numero)).toEqual([3, 2, 1])
    const infinite: InfiniteData<JornadaPage> = {
      pages: [
        { rows: [jornada(4), jornada(3)], total: 4, page: 1, limit: 2 },
        { rows: [jornada(2), jornada(1)], total: 4, page: 2, limit: 2 },
      ],
      pageParams: [1, 2],
    }
    const updated = insertGeneratedJornadaInInfinite(infinite, jornada(5))!
    expect(updated.pages.map((page) => page.rows.map((entry) => entry.numero))).toEqual([[5, 4], [3, 2]])
    expect(updated.pages.every((page) => page.total === 5)).toBe(true)
  })

  it("repaginates a complete deletion and rejects an incomplete offset cache", () => {
    const complete: InfiniteData<JornadaPage> = {
      pages: [
        { rows: [jornada(4), jornada(3)], total: 4, page: 1, limit: 2 },
        { rows: [jornada(2), jornada(1)], total: 4, page: 2, limit: 2 },
      ],
      pageParams: [1, 2],
    }
    const removed = removeJornadaFromInfinite(complete, "j4")!
    expect(removed && removed.pages.map((page) => page.rows.map((entry) => entry.numero))).toEqual([[3, 2], [1]])
    expect(removed && removed.pages[0].total).toBe(3)
    expect(removeJornadaFromInfinite({ pages: [complete.pages[0]], pageParams: [1] }, "j4")).toBeNull()
  })

  it("patches a partido in finite and infinite jornada projections", () => {
    const original = partido("p1", "j1", "2026-08-14T10:00:00Z")
    const updated = { ...original, estado: "FINALIZADO", golesLocal: 2 }
    expect(patchPartidoInJornadas([jornada(1, [original])], updated)?.[0].partidos?.[0]).toMatchObject(updated)
    const infinite: InfiniteData<JornadaPage> = { pages: [{ rows: [jornada(1, [original])], total: 1, page: 1, limit: 4 }], pageParams: [1] }
    expect(patchPartidoInInfinite(infinite, updated)?.pages[0].rows[0].partidos?.[0]).toMatchObject(updated)
  })
})
