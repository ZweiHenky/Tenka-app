import { describe, expect, it } from "vitest"
import { buildLeagueQuery } from "./league-query"

describe("league list query", () => {
  it("serializes normalized coordinates including zero", () => {
    const query = new URLSearchParams(buildLeagueQuery({ page: 1, limit: 20, latitude: 0, longitude: 0 }))
    expect(query.get("latitude")).toBe("0")
    expect(query.get("longitude")).toBe("0")
  })

  it("keeps search and filters together with coordinates", () => {
    const query = new URLSearchParams(buildLeagueQuery({
      page: 2,
      limit: 20,
      search: "Liga lejana",
      categoriaId: "cat-1",
      latitude: 19.433,
      longitude: -99.133,
    }))
    expect(Object.fromEntries(query)).toMatchObject({
      page: "2",
      search: "Liga lejana",
      categoriaId: "cat-1",
      latitude: "19.433",
      longitude: "-99.133",
    })
  })
})
