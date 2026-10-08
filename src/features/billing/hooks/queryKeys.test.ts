import { describe, expect, it } from "vitest"
import { billingKeys } from "./queryKeys"

describe("billingKeys", () => {
  it("isolates state by authenticated user", () => {
    expect(billingKeys.state("user-1")).toEqual(["billing", "me", "user-1"])
    expect(billingKeys.state("user-1")).not.toEqual(billingKeys.state("user-2"))
  })

  it("isolates offerings by identity, release, platform and environment", () => {
    const key = billingKeys.offerings("billing-1", "2026-09-mx-v1", "ios", "PREVIEW")
    expect(key).toEqual(["billing", "offerings", "billing-1", "2026-09-mx-v1", "ios", "PREVIEW"])
    expect(key).not.toEqual(billingKeys.offerings("billing-2", "2026-09-mx-v1", "ios", "PREVIEW"))
    expect(key).not.toEqual(billingKeys.offerings("billing-1", "2026-09-mx-v1", "android", "PREVIEW"))
  })

  it("isolates operational control by authenticated administrator", () => {
    expect(billingKeys.operationalControl("admin-1")).toEqual([
      "billing", "admin", "operational-control", "admin-1",
    ])
    expect(billingKeys.operationalControl("admin-1"))
      .not.toEqual(billingKeys.operationalControl("admin-2"))
  })
})
