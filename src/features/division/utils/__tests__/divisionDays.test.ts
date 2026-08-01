import { describe, expect, it } from "vitest"
import {
  getDivisionDaysMode,
  getSelectedDivisionDays,
  toggleDivisionDay,
} from "../divisionDays"

describe("divisionDays", () => {
  it("recognizes weekday and weekend presets", () => {
    expect(getDivisionDaysMode("L-V")).toBe("weekdays")
    expect(getDivisionDaysMode("L,Ma,Mi,J,V")).toBe("weekdays")
    expect(getDivisionDaysMode("S-D")).toBe("weekend")
    expect(getDivisionDaysMode("S,D")).toBe("weekend")
  })

  it("uses custom mode for existing partial selections", () => {
    expect(getDivisionDaysMode("L,Mi,V,D")).toBe("custom")
    expect(getDivisionDaysMode("Mi")).toBe("custom")
    expect(getDivisionDaysMode("")).toBe("")
  })

  it("returns custom days in Monday-to-Sunday order", () => {
    expect(getSelectedDivisionDays("D,V,L,Mi")).toEqual([1, 3, 5, 0])
  })

  it("adds and removes omitted days while preserving canonical order", () => {
    let value = toggleDivisionDay("", 5)
    value = toggleDivisionDay(value, 1)
    value = toggleDivisionDay(value, 0)
    value = toggleDivisionDay(value, 3)

    expect(value).toBe("L,Mi,V,D")
    expect(toggleDivisionDay(value, 3)).toBe("L,V,D")
  })
})
