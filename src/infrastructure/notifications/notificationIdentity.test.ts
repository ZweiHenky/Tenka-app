import { describe, expect, it, vi } from "vitest"
import { nonemptyId, syncNotificationIdentity } from "./notificationIdentity"

describe("notification identity sync", () => {
  it("does not call the API without a current identity", async () => {
    const subscribe = vi.fn()
    expect(await syncNotificationIdentity({ currentId: "  ", pushSubscriptionId: null, follows: [{ divisionId: "d1" }], subscribe })).toBeNull()
    expect(subscribe).not.toHaveBeenCalled()
  })

  it("registers every persisted follow for the current device", async () => {
    const subscribe = vi.fn().mockResolvedValue(undefined)
    await expect(syncNotificationIdentity({ currentId: "new", pushSubscriptionId: "push", follows: [{ divisionId: "d1" }, { divisionId: "d2" }], subscribe })).resolves.toBe("new")
    expect(subscribe).toHaveBeenCalledTimes(2)
    expect(subscribe).toHaveBeenCalledWith({ divisionId: "d1", oneSignalId: "new", pushSubscriptionId: "push" })
    expect(nonemptyId("  id  ")).toBe("id")
  })

  it("does not register follows until a push subscription exists", async () => {
    const subscribe = vi.fn()
    await expect(syncNotificationIdentity({ currentId: "new", pushSubscriptionId: "", follows: [{ divisionId: "d1" }], subscribe })).resolves.toBeNull()
    expect(subscribe).not.toHaveBeenCalled()
  })
})
