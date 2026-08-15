import { describe, expect, it } from "vitest"
import { getNextLeaguePage, HOME_LEAGUE_PAGE_SIZE } from "./leaguePagination"

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
})
