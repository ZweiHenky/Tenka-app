import { describe, expect, it } from "vitest"
import { revenueCatApiKeyForPlatform, revenueCatLogLevel } from "./revenueCatConfig"

const keys = { apple: "appl_public", google: "goog_public" }

describe("RevenueCat configuration", () => {
  it("selects the store-specific Public SDK key", () => {
    expect(revenueCatApiKeyForPlatform("ios", keys)).toBe("appl_public")
    expect(revenueCatApiKeyForPlatform("android", keys)).toBe("goog_public")
  })

  it("does not configure an unsupported platform", () => {
    expect(revenueCatApiKeyForPlatform("web", keys)).toBeNull()
  })

  it("keeps verbose logs out of preview and production", () => {
    expect(revenueCatLogLevel("local")).toBe("DEBUG")
    expect(revenueCatLogLevel("preview")).toBe("WARN")
    expect(revenueCatLogLevel("production")).toBe("WARN")
  })
})
