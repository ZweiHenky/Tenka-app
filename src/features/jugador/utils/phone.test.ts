import { describe, expect, it } from "vitest"
import { normalizeJugadorPhone } from "./phone"

describe("normalizeJugadorPhone", () => {
  it("combines a country calling code with a national number", () => {
    expect(normalizeJugadorPhone("52", "55 5123 4567")).toBe("+525551234567")
  })

  it("does not duplicate the prefix of an international number", () => {
    expect(normalizeJugadorPhone("52", "+52 55 5123 4567")).toBe("+525551234567")
    expect(normalizeJugadorPhone("52", "0052 55 5123 4567")).toBe("+525551234567")
    expect(normalizeJugadorPhone("52", "52 55 5123 4567")).toBe("+525551234567")
  })

  it("rejects E.164 values outside 8 to 15 digits", () => {
    expect(normalizeJugadorPhone("52", "123")).toBeNull()
    expect(normalizeJugadorPhone("52", "+1234567890123456")).toBeNull()
  })
})
