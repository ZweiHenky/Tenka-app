import { describe, expect, it } from "vitest"
import { getApiErrorMetadata, hasApiErrorCode } from "./errors"

describe("API error metadata", () => {
  it("returns preserved backend code and details without using the Axios transport code", () => {
    const error = Object.assign(new Error("Límite alcanzado"), {
      code: "ERR_BAD_REQUEST",
      apiCode: "QUOTA_TEAMS_EXCEEDED",
      apiDetails: { limit: 1 },
    })

    expect(getApiErrorMetadata(error)).toEqual({ code: "QUOTA_TEAMS_EXCEEDED", details: { limit: 1 } })
    expect(hasApiErrorCode(error, "QUOTA_TEAMS_EXCEEDED")).toBe(true)
  })
})
