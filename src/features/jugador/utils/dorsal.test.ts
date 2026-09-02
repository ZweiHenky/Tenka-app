import { describe, expect, it } from "vitest"
import { parseDorsal } from "./dorsal"

describe("parseDorsal", () => {
  it.each([
    ["0", 0],
    ["10", 10],
    ["999", 999],
    [" 7 ", 7],
  ])("parses %s", (value, expected) => {
    expect(parseDorsal(value)).toBe(expected)
  })

  it.each(["", " ", "-1", "1000", "7.5", "abc"])("rejects %s", (value) => {
    expect(parseDorsal(value)).toBeNull()
  })
})
