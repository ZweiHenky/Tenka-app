import { describe, expect, it } from "vitest"
import { getPlayoffRoundMatchCounts, getPlayoffTeamOptions } from "../playoff"

describe("getPlayoffTeamOptions", () => {
  it("returns only supported bracket sizes covered by assigned teams", () => {
    expect(getPlayoffTeamOptions(1)).toEqual([])
    expect(getPlayoffTeamOptions(2)).toEqual([2])
    expect(getPlayoffTeamOptions(10)).toEqual([2, 4, 8])
    expect(getPlayoffTeamOptions(40)).toEqual([2, 4, 8, 16, 32])
  })
})

describe("getPlayoffRoundMatchCounts", () => {
  it("supports a one-round bracket", () => {
    expect(getPlayoffRoundMatchCounts(1)).toEqual([1])
  })

  it("supports a five-round bracket", () => {
    expect(getPlayoffRoundMatchCounts(5)).toEqual([16, 8, 4, 2, 1])
  })
})
