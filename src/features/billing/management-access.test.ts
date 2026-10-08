import { describe, expect, it } from "vitest"
import { managementSurface } from "./management-access"

describe("managementSurface", () => {
  it("preserves legacy screens when the backend omits the contract", () => {
    expect(managementSurface()).toBe("MANAGE")
  })

  it.each(["FULL", "LIMITED_SETUP"] as const)("allows %s", (access) => {
    expect(managementSurface(access)).toBe("MANAGE")
  })

  it("separates read-only access from blocked evidence", () => {
    expect(managementSurface("READ_ONLY")).toBe("READ_ONLY")
    expect(managementSurface("BLOCKED")).toBe("PAYWALL")
  })
})
