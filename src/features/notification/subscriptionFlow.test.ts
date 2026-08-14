import { describe, expect, it, vi } from "vitest"
import { changeDivisionSubscription } from "./subscriptionFlow"

describe("division notification subscription flow", () => {
  it("commits local state only after the subscribe request succeeds", async () => {
    let resolveRequest: (() => void) | undefined
    const subscribe = vi.fn(() => new Promise<void>((resolve) => { resolveRequest = resolve }))
    const commitLocalState = vi.fn()
    const operation = changeDivisionSubscription({ subscribed: false, divisionId: "d1", oneSignalId: "one", pushSubscriptionId: "push", subscribe, unsubscribe: vi.fn(), commitLocalState })
    expect(commitLocalState).not.toHaveBeenCalled()
    resolveRequest?.()
    await operation
    expect(commitLocalState).toHaveBeenCalledOnce()
  })

  it("does not commit local state when unsubscribe fails", async () => {
    const failure = new Error("offline")
    const commitLocalState = vi.fn()
    await expect(changeDivisionSubscription({
      subscribed: true, divisionId: "d1", oneSignalId: "one", pushSubscriptionId: "push",
      subscribe: vi.fn(), unsubscribe: vi.fn().mockRejectedValue(failure), commitLocalState,
    })).rejects.toBe(failure)
    expect(commitLocalState).not.toHaveBeenCalled()
  })

  it("unsubscribes using both current OneSignal identifiers", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(undefined)

    await changeDivisionSubscription({
      subscribed: true, divisionId: "d1", oneSignalId: "one", pushSubscriptionId: "push",
      subscribe: vi.fn(), unsubscribe, commitLocalState: vi.fn(),
    })

    expect(unsubscribe).toHaveBeenCalledWith({ divisionId: "d1", oneSignalId: "one", pushSubscriptionId: "push" })
  })
})
