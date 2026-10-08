import { beforeEach, describe, expect, it, vi } from "vitest"
import { billingApi } from "./billing"

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock("@/infrastructure/api/client", () => ({
  api: { get: mocks.get, post: mocks.post, put: mocks.put },
}))

describe("billingApi", () => {
  beforeEach(() => vi.clearAllMocks())

  it("gets and unwraps the authenticated billing state", async () => {
    const state = { role: "LIGA", revenueCatAppUserId: "billing-1", purchasesEnabled: false }
    mocks.get.mockResolvedValue({ data: { success: true, data: state } })

    await expect(billingApi.getState()).resolves.toEqual(state)
    expect(mocks.get).toHaveBeenCalledWith("/api/billing/state")
  })

  it("bootstraps without sending client-controlled identity or body", async () => {
    const state = { role: "LIGA", revenueCatAppUserId: "billing-1", purchasesEnabled: false }
    mocks.post.mockResolvedValue({ data: { success: true, data: state } })

    await expect(billingApi.bootstrap()).resolves.toEqual(state)
    expect(mocks.post).toHaveBeenCalledWith("/api/billing/bootstrap")
  })

  it("gets and unwraps the active catalog", async () => {
    const catalog = { available: true, environment: "PREVIEW", release: null, purchasesEnabled: false }
    mocks.get.mockResolvedValue({ data: { success: true, data: catalog } })

    await expect(billingApi.getCatalog()).resolves.toEqual(catalog)
    expect(mocks.get).toHaveBeenCalledWith("/api/billing/catalog")
  })

  it("gets and unwraps the billing operational control", async () => {
    const control = {
      environment: "PREVIEW",
      mode: "PURCHASES_PAUSED",
      reason: "Initial rollout pause",
      changedAt: "2026-10-02T20:00:00.000Z",
      version: 1,
    }
    mocks.get.mockResolvedValue({ data: { success: true, data: control } })

    await expect(billingApi.getOperationalControl()).resolves.toEqual(control)
    expect(mocks.get).toHaveBeenCalledWith("/api/billing/admin/operational-control")
  })

  it("updates operational control with an idempotency key", async () => {
    const input = {
      mode: "ENABLED" as const,
      reason: "Closed Google Play sandbox test",
      expectedVersion: 1,
    }
    const control = { ...input, environment: "PREVIEW", changedAt: "2026-10-02T20:00:00.000Z", version: 2 }
    mocks.put.mockResolvedValue({ data: { success: true, data: control } })

    await expect(billingApi.updateOperationalControl(input)).resolves.toEqual(control)
    expect(mocks.put).toHaveBeenCalledWith(
      "/api/billing/admin/operational-control",
      input,
      { headers: { "Idempotency-Key": expect.stringMatching(/^operational-control-[A-Za-z0-9-]+$/) } },
    )
  })

  it("propagates API failures", async () => {
    const error = new Error("request failed")
    mocks.get.mockRejectedValue(error)

    await expect(billingApi.getState()).rejects.toBe(error)
  })

  it("posts and preserves a pending checkout sync result", async () => {
    const result = {
      status: "PENDING",
      reason: "checkout_pending",
      attempt: { id: "attempt-1", status: "VERIFICATION_PENDING" },
    }
    mocks.post.mockResolvedValue({ data: { success: true, data: result } })

    await expect(billingApi.sync("attempt-1")).resolves.toEqual(result)
    expect(mocks.post).toHaveBeenCalledWith("/api/billing/sync", { checkoutAttemptId: "attempt-1" })
  })

  it("syncs the latest checkout with an empty body", async () => {
    mocks.post.mockResolvedValue({ data: { success: true, data: { status: "SYNCHRONIZED", attempt: null } } })

    await billingApi.sync()
    expect(mocks.post).toHaveBeenCalledWith("/api/billing/sync", {})
  })

  it("abandons a checkout with its version and an idempotency key", async () => {
    const result = { status: "ABANDONED", attempt: { id: "attempt-1", status: "ABANDONED", version: 4 } }
    mocks.post.mockResolvedValue({ data: { success: true, data: result } })

    await expect(billingApi.abandonCheckout("attempt-1", 3)).resolves.toEqual(result)
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/billing/checkout-attempts/attempt-1/abandon",
      { expectedVersion: 3 },
      { headers: { "Idempotency-Key": expect.stringMatching(/^checkout-abandon-[A-Za-z0-9-]+$/) } },
    )
  })

  it("previews a plan change without commercial idempotency", async () => {
    const preview = { eligible: true, timing: "TWO_STEP", operationId: null }
    mocks.post.mockResolvedValue({ data: { success: true, data: preview } })

    await expect(billingApi.changePreview({
      logicalProductId: "tenka_capacity_6", billingInterval: "ANNUAL",
    })).resolves.toEqual(preview)
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/billing/change-preview",
      { logicalProductId: "tenka_capacity_6", billingInterval: "ANNUAL" },
    )
  })

  it("abandons a change operation with an idempotency key", async () => {
    const operation = { id: "operation-1", status: "ABANDONED", version: 6 }
    mocks.post.mockResolvedValue({ data: { success: true, data: operation } })

    await expect(billingApi.abandonChangeOperation("operation-1")).resolves.toEqual(operation)
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/billing/change-operations/operation-1/abandon",
      {},
      { headers: { "Idempotency-Key": expect.stringMatching(/^change-abandon-[A-Za-z0-9-]+$/) } },
    )
  })

  it("confirms the first product-change step with preview concurrency identity", async () => {
    const input = {
      targetVariantId: "variant-target",
      expectedSourceVariantId: "variant-source",
      previewFingerprint: "preview-fingerprint",
    }
    const execution = { operation: { id: "operation-1" }, attempt: { id: "attempt-1" }, instruction: { step: "FIRST" } }
    mocks.post.mockResolvedValue({ data: { success: true, data: execution } })

    await expect(billingApi.confirmFirstChangeStep(input)).resolves.toEqual(execution)
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/billing/change-operations/confirm",
      input,
      { headers: { "Idempotency-Key": expect.stringMatching(/^change-first-confirm-[A-Za-z0-9-]+$/) } },
    )
  })

  it("confirms the final product-change step with operation version", async () => {
    const execution = { operation: { id: "operation-1" }, attempt: { id: "attempt-2" }, instruction: { step: "FINAL" } }
    mocks.post.mockResolvedValue({ data: { success: true, data: execution } })

    await expect(billingApi.confirmFinalChangeStep("operation-1", 7)).resolves.toEqual(execution)
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/billing/change-operations/operation-1/final-step/confirm",
      { expectedVersion: 7 },
      { headers: { "Idempotency-Key": expect.stringMatching(/^change-final-confirm-[A-Za-z0-9-]+$/) } },
    )
  })

  it("rejects a malformed successful response for durable change mutations", async () => {
    mocks.post.mockResolvedValue({ data: { success: true } })
    await expect(billingApi.changePreview({
      logicalProductId: "tenka_capacity_6", billingInterval: "ANNUAL",
    })).rejects.toThrow("Invalid billing change preview response")
  })
})
