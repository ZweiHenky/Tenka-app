import { describe, expect, it, vi } from "vitest"
import { withNetworkRetry } from "./withNetworkRetry"

function networkError(message = "Network Error") {
  return Object.assign(new Error(message), { response: undefined })
}

function httpError(message = "Not Found", status = 404) {
  return Object.assign(new Error(message), { response: { status } })
}

describe("withNetworkRetry", () => {
  it("resolves when the request succeeds on the first attempt", async () => {
    await expect(withNetworkRetry(() => Promise.resolve("ok"))).resolves.toBe("ok")
  })

  it("retries once on a network error and resolves on the retry", async () => {
    const request = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValueOnce("ok")
    await expect(withNetworkRetry(request)).resolves.toBe("ok")
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("does not retry on an HTTP error with a response", async () => {
    const request = vi.fn().mockRejectedValue(httpError())
    await expect(withNetworkRetry(request)).rejects.toMatchObject({ message: "Not Found" })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("rejects after exhausting retries on persistent network errors", async () => {
    const request = vi.fn().mockRejectedValue(networkError())
    await expect(withNetworkRetry(request)).rejects.toMatchObject({ message: "Network Error" })
    expect(request).toHaveBeenCalledTimes(2)
  })
})
