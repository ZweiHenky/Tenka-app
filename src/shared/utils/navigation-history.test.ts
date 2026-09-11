import { describe, expect, it } from "vitest"
import { hasRouteInHistory, type NavigationStateLike } from "./navigation-history"

const state: NavigationStateLike = {
  routes: [
    {
      name: "(public)",
      state: {
        routes: [
          { name: "equipo/[id]", params: { id: "team-1" } },
          { name: "jugador/[id]", params: { id: "player-1", returnTeamId: "team-1" } },
        ],
      },
    },
  ],
}

describe("hasRouteInHistory", () => {
  it("finds a nested dynamic route by identity params", () => {
    expect(hasRouteInHistory(state, "equipo/[id]", { id: "team-1" })).toBe(true)
  })

  it("ignores navigation-only query params", () => {
    expect(hasRouteInHistory(state, "jugador/[id]", { id: "player-1" })).toBe(true)
  })

  it("does not confuse different entities using the same screen", () => {
    expect(hasRouteInHistory(state, "equipo/[id]", { id: "team-2" })).toBe(false)
  })
})
