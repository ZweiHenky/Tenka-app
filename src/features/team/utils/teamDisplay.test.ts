import { describe, expect, it } from "vitest"
import { getDuplicateTeamNames, getTeamCode, normalizeTeamDisplayName } from "./teamDisplay"

describe("team display helpers", () => {
  it("creates the same stable four-character code from an id", () => {
    expect(getTeamCode("cm-team-ab12")).toBe("AB12")
    expect(getTeamCode("a-1")).toBe("00A1")
  })

  it("detects visually equivalent duplicate names", () => {
    const duplicates = getDuplicateTeamNames([
      { nombre: "Leones" },
      { nombre: "  LEÓNES " },
      { nombre: "Tigres" },
    ])

    expect(duplicates).toEqual(new Set([normalizeTeamDisplayName("Leones")]))
  })
})
