import { describe, expect, it } from "vitest"
import { redactUrlQuery } from "./url-redaction"

describe("redactUrlQuery", () => {
  it("removes sensitive query parameters from diagnostics", () => {
    expect(redactUrlQuery("https://api.test/api/ligas?latitude=19.433&longitude=-99.133")).toBe("https://api.test/api/ligas")
  })

  it("handles absent URLs", () => {
    expect(redactUrlQuery(undefined)).toBeUndefined()
  })
})
