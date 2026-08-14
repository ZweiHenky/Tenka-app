import { afterEach, describe, expect, it, vi } from "vitest"
import { waitForIdle } from "./wait-for-idle"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("waitForIdle", () => {
  it("uses requestIdleCallback when available", async () => {
    const idle = vi.fn((callback: () => void) => { callback(); return 1 })
    vi.stubGlobal("requestIdleCallback", idle)

    await waitForIdle(100)

    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 100 })
  })

  it("falls back to a timer", async () => {
    vi.useFakeTimers()
    const promise = waitForIdle()
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
  })
})
