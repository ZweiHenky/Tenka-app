import { describe, expect, it, vi } from "vitest"
import {
  committed,
  isAmbiguousNetworkError,
  notCommitted,
  withAmbiguousWriteRecovery,
} from "./ambiguous-write"

const networkError = () => ({
  isAxiosError: true,
  code: "ERR_NETWORK",
  message: "Network Error",
  request: {},
})

describe("withAmbiguousWriteRecovery", () => {
  it("returns the write response without reconciling when the response arrives", async () => {
    const reconcile = vi.fn()

    await expect(withAmbiguousWriteRecovery(
      async () => ({ id: "created" }),
      reconcile,
    )).resolves.toEqual({ id: "created" })
    expect(reconcile).not.toHaveBeenCalled()
  })

  it("returns canonical data when a network failure is confirmed as committed", async () => {
    const write = vi.fn().mockRejectedValue(networkError())
    const reconcile = vi.fn().mockResolvedValue(committed({ id: "canonical" }))

    await expect(withAmbiguousWriteRecovery(write, reconcile)).resolves.toEqual({ id: "canonical" })
    expect(write).toHaveBeenCalledOnce()
    expect(reconcile).toHaveBeenCalledOnce()
  })

  it("preserves a real HTTP error without trying reconciliation", async () => {
    const error = { isAxiosError: true, code: "ERR_BAD_REQUEST", response: { status: 409 } }
    const reconcile = vi.fn()

    await expect(withAmbiguousWriteRecovery(
      vi.fn().mockRejectedValue(error),
      reconcile,
    )).rejects.toBe(error)
    expect(reconcile).not.toHaveBeenCalled()
  })

  it("preserves cancellation and unconfirmed network failures", async () => {
    expect(isAmbiguousNetworkError({ isAxiosError: true, code: "ERR_CANCELED", request: {} })).toBe(false)

    const error = networkError()
    await expect(withAmbiguousWriteRecovery(
      vi.fn().mockRejectedValue(error),
      vi.fn().mockResolvedValue(notCommitted()),
      1,
    )).rejects.toBe(error)
  })
})
