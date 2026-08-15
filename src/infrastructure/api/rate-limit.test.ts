import { describe, expect, it } from "vitest"
import { enrichRateLimitError, getRetryAfterSeconds, isRateLimitError, parseRetryAfter, rateLimitMessage } from "./rate-limit"

describe("rate-limit", () => {
  it("parses seconds and HTTP dates", () => {
    expect(parseRetryAfter("12")).toBe(12)
    expect(parseRetryAfter("Wed, 21 Oct 2015 07:28:10 GMT", Date.parse("Wed, 21 Oct 2015 07:28:00 GMT"))).toBe(10)
    expect(parseRetryAfter("invalid")).toBeUndefined()
  })

  it("formats useful retry messages", () => {
    expect(rateLimitMessage()).toContain("más tarde")
    expect(rateLimitMessage(20)).toContain("20 segundos")
    expect(rateLimitMessage(61)).toContain("2 minutos")
  })

  it("enriches Axios rate-limit errors", () => {
    const error = Object.assign(new Error("Request failed"), {
      response: { status: 429, headers: { "retry-after": "90" } },
    })
    expect(enrichRateLimitError(error)).toBe(true)
    expect(isRateLimitError(error)).toBe(true)
    expect(getRetryAfterSeconds(error)).toBe(90)
    expect(error.message).toContain("2 minutos")
  })

  it("enriches Better Auth errors with X-Retry-After", () => {
    const error = Object.assign(new Error("Too many requests"), { status: 429 })
    expect(enrichRateLimitError(error, 429, new Headers({ "X-Retry-After": "45" }))).toBe(true)
    expect(error.message).toContain("45 segundos")
  })

  it("does not change unrelated errors", () => {
    const error = new Error("Conflict")
    expect(enrichRateLimitError(error, 409)).toBe(false)
    expect(error.message).toBe("Conflict")
  })
})
