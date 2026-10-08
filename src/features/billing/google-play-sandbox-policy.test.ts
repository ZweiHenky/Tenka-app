import { describe, expect, it } from "vitest"
import {
  canStartGooglePlaySandboxPurchase,
  canUseGooglePlaySandboxPurchases,
} from "./google-play-sandbox-policy"

const valid = {
  appEnvironment: "local" as const,
  platform: "android",
  catalogEnvironment: "PREVIEW" as const,
  explicitlyEnabled: true,
  role: "LIGA",
  appUserId: "billing_account-1",
}

describe("Google Play sandbox purchase policy", () => {
  it("allows the explicit local Android preview-catalog combination", () => {
    expect(canUseGooglePlaySandboxPurchases(valid)).toBe(true)
  })

  it("allows an explicit preview APK against the preview catalog", () => {
    expect(canUseGooglePlaySandboxPurchases({ ...valid, appEnvironment: "preview" })).toBe(true)
  })

  it.each([
    { appEnvironment: "production" as const },
    { platform: "ios" },
    { platform: "web" },
    { catalogEnvironment: "PRODUCTION" as const },
    { explicitlyEnabled: false },
    { role: "CAPITAN" },
    { appUserId: null },
    { appUserId: "anonymous-user" },
    { appUserId: "billing_account/alias" },
  ])("rejects unsafe policy input %#", (override) => {
    expect(canUseGooglePlaySandboxPurchases({ ...valid, ...override })).toBe(false)
  })

  it("starts only after durable checkout recovery and both backend barriers allow purchases", () => {
    const ready = {
      runtimeEligible: true,
      effectiveAccess: "FREE" as const,
      billingStatePurchasesEnabled: true,
      catalogPurchasesEnabled: true,
      activeCheckoutRecovered: true,
      activeCheckoutExists: false,
      prerequisitesReady: true,
    }
    expect(canStartGooglePlaySandboxPurchase(ready)).toBe(true)
    const booleanKeys = Object.keys(ready).filter((key) => key !== "effectiveAccess") as Exclude<keyof typeof ready, "effectiveAccess">[]
    for (const key of booleanKeys) {
      if (key === "activeCheckoutExists") {
        expect(canStartGooglePlaySandboxPurchase({ ...ready, [key]: true })).toBe(false)
      } else {
        expect(canStartGooglePlaySandboxPurchase({ ...ready, [key]: false })).toBe(false)
      }
    }
  })

  it.each(["PAID", "LOCAL_GRACE", "ENTERPRISE", "ADMIN"] as const)(
    "does not reuse the initial purchase flow for %s access",
    (effectiveAccess) => {
      expect(canStartGooglePlaySandboxPurchase({
        runtimeEligible: true,
        effectiveAccess,
        billingStatePurchasesEnabled: true,
        catalogPurchasesEnabled: true,
        activeCheckoutRecovered: true,
        activeCheckoutExists: false,
        prerequisitesReady: true,
      })).toBe(false)
    },
  )

  it("allows migration accounts to complete their initial purchase", () => {
    expect(canStartGooglePlaySandboxPurchase({
      runtimeEligible: true,
      effectiveAccess: "MIGRATION",
      billingStatePurchasesEnabled: true,
      catalogPurchasesEnabled: true,
      activeCheckoutRecovered: true,
      activeCheckoutExists: false,
      prerequisitesReady: true,
    })).toBe(true)
  })
})
