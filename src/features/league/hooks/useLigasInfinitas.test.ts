import { describe, expect, it } from "vitest"
import { getNextLeaguePage, HOME_LEAGUE_PAGE_SIZE } from "./leaguePagination"
import { isNearbyLeagueQuery, leagueInfiniteQueryKey } from "./leagueQueryKey"

describe("league pagination", () => {
  it("uses a page size that avoids five-row request bursts", () => {
    expect(HOME_LEAGUE_PAGE_SIZE).toBe(20)
  })

  it("uses the authoritative total instead of requesting an empty final page", () => {
    expect(getNextLeaguePage({ rows: Array(20), total: 20, page: 1, limit: 20 })).toBeUndefined()
    expect(getNextLeaguePage({ rows: Array(20), total: 21, page: 1, limit: 20 })).toBe(2)
    expect(getNextLeaguePage({ rows: Array(20), total: 40, page: 2, limit: 20 })).toBeUndefined()
    expect(getNextLeaguePage({ rows: [], total: 100, page: 1, limit: 20 })).toBeUndefined()
  })

  it("starts a separate cache when normalized coordinates arrive", () => {
    const normal = leagueInfiniteQueryKey({ search: "Centro" })
    const nearby = leagueInfiniteQueryKey({ search: "Centro", latitude: 19.433, longitude: -99.133 })

    expect(normal).not.toEqual(nearby)
    expect(nearby[1]).toMatchObject({ latitude: 19.433, longitude: -99.133 })
    expect(isNearbyLeagueQuery(nearby)).toBe(true)
    expect(isNearbyLeagueQuery(normal)).toBe(false)
  })
})
