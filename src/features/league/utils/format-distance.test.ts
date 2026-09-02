import { describe, expect, it } from "vitest"
import { formatDistance } from "./format-distance"

describe("formatDistance", () => {
  it("uses meters below one kilometer", () => {
    expect(formatDistance(0)).toBe("0 m")
    expect(formatDistance(0.8496)).toBe("850 m")
  })

  it("uses one decimal from one kilometer", () => {
    expect(formatDistance(1)).toBe("1.0 km")
    expect(formatDistance(3.24)).toBe("3.2 km")
  })

  it("omits invalid or missing values", () => {
    expect(formatDistance(undefined)).toBeUndefined()
    expect(formatDistance(-1)).toBeUndefined()
    expect(formatDistance(Number.NaN)).toBeUndefined()
  })
})
