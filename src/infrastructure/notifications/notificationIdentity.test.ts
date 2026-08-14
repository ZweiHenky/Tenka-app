import { describe, expect, it, vi } from "vitest"
import { createNotificationIdentitySynchronizer, nonemptyId } from "./notificationIdentity"

describe("notification identity sync", () => {
  it("does not call the API without a current identity", async () => {
    const syncNotificationIdentity = createNotificationIdentitySynchronizer()
    const sync = vi.fn()
    expect(await syncNotificationIdentity({ currentId: "  ", pushSubscriptionId: null, userIdentity: null, follows: [{ divisionId: "d1" }], sync })).toBeNull()
    expect(sync).not.toHaveBeenCalled()
  })

  it("sends one sorted, deduplicated batch for all persisted follows", async () => {
    const syncNotificationIdentity = createNotificationIdentitySynchronizer()
    const sync = vi.fn().mockResolvedValue(undefined)
    await expect(syncNotificationIdentity({ currentId: "new", pushSubscriptionId: "push", userIdentity: "user-1", follows: [{ divisionId: "d2" }, { divisionId: "d1" }, { divisionId: "d2" }], sync })).resolves.toBe("new")
    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith({ divisionIds: ["d1", "d2"], oneSignalId: "new", pushSubscriptionId: "push" })
    expect(nonemptyId("  id  ")).toBe("id")
  })

  it("does not register follows until a push subscription exists", async () => {
    const syncNotificationIdentity = createNotificationIdentitySynchronizer()
    const sync = vi.fn()
    await expect(syncNotificationIdentity({ currentId: "new", pushSubscriptionId: "", userIdentity: null, follows: [{ divisionId: "d1" }], sync })).resolves.toBeNull()
    expect(sync).not.toHaveBeenCalled()
  })

  it("coalesces concurrent calls and skips an unchanged successful signature", async () => {
    const syncNotificationIdentity = createNotificationIdentitySynchronizer()
    let resolveRequest!: () => void
    const sync = vi.fn(() => new Promise<void>((resolve) => { resolveRequest = resolve }))
    const input = { currentId: "one", pushSubscriptionId: "push", userIdentity: "user-1", follows: [{ divisionId: "d1" }], sync }

    const first = syncNotificationIdentity(input)
    const concurrent = syncNotificationIdentity(input)
    expect(sync).toHaveBeenCalledTimes(0)
    await vi.waitFor(() => expect(sync).toHaveBeenCalledTimes(1))
    resolveRequest()
    await Promise.all([first, concurrent])
    await syncNotificationIdentity(input)
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it("resynchronizes when only the authenticated user identity changes", async () => {
    const syncNotificationIdentity = createNotificationIdentitySynchronizer()
    const sync = vi.fn().mockResolvedValue(undefined)
    const base = { currentId: "one", pushSubscriptionId: "push", follows: [{ divisionId: "d1" }], sync }

    await syncNotificationIdentity({ ...base, userIdentity: "user-1" })
    await syncNotificationIdentity({ ...base, userIdentity: null })
    expect(sync).toHaveBeenCalledTimes(2)
  })
})
