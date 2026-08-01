import { describe, expect, it } from "vitest"
import { formatSaldoPendiente, isValidSaldoInput, normalizeSaldoInput } from "../teamSaldo"

describe("teamSaldo", () => {
  it("normalizes decimal commas and surrounding whitespace", () => {
    expect(normalizeSaldoInput(" 1250,50 ")).toBe("1250.50")
  })

  it("accepts nonnegative amounts with at most two decimals", () => {
    expect(isValidSaldoInput("0")).toBe(true)
    expect(isValidSaldoInput("1250,5")).toBe(true)
    expect(isValidSaldoInput("1250.50")).toBe(true)
  })

  it("rejects negative, empty, malformed, and over-precise amounts", () => {
    expect(isValidSaldoInput("-1")).toBe(false)
    expect(isValidSaldoInput("")).toBe(false)
    expect(isValidSaldoInput("12.345")).toBe(false)
    expect(isValidSaldoInput("abc")).toBe(false)
  })

  it("formats positive balances and no-debt states", () => {
    expect(formatSaldoPendiente("1250")).toBe("$1,250.00 pendiente")
    expect(formatSaldoPendiente("0")).toBe("Sin adeudo")
    expect(formatSaldoPendiente()).toBe("Sin adeudo")
  })
})
