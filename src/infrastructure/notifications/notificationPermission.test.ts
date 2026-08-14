import { describe, expect, it, vi } from "vitest"
import { ensureNotificationPermission } from "./notificationPermission"

describe("notification permission", () => {
  it("does not prompt when permission is already granted", async () => {
    const requestPermission = vi.fn()

    await expect(ensureNotificationPermission({
      getPermission: vi.fn().mockResolvedValue(true),
      requestPermission,
    })).resolves.toBe(true)

    expect(requestPermission).not.toHaveBeenCalled()
  })

  it("returns the permission prompt result when permission is missing", async () => {
    await expect(ensureNotificationPermission({
      getPermission: vi.fn().mockResolvedValue(false),
      requestPermission: vi.fn().mockResolvedValue(false),
    })).resolves.toBe(false)
  })
})
