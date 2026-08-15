import { describe, expect, it } from "vitest"
import { getAuthErrorMessage } from "./errors"
import { captureAuthRateLimit } from "./rate-limit"

describe("getAuthErrorMessage", () => {
  it("translates Better Auth rate limits", () => {
    expect(getAuthErrorMessage({ status: 429, message: "Too many requests. Please try again later." }, "fallback"))
      .toBe("Demasiadas solicitudes. Intenta de nuevo más tarde.")
  })

  it("includes the captured retry time", () => {
    captureAuthRateLimit({ status: 429 }, 429, new Headers({ "X-Retry-After": "90" }))
    expect(getAuthErrorMessage({ status: 429 }, "fallback"))
      .toContain("2 minutos")
  })

  it("keeps existing auth code mappings", () => {
    expect(getAuthErrorMessage({ code: "INVALID_OTP" }, "fallback")).toContain("incorrecto")
  })
})
