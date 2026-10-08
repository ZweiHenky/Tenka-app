import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  MakePurchaseResult,
  PurchasesPackage,
  PurchasesOfferings,
  STORE_REPLACEMENT_MODE,
} from "react-native-purchases"
import { describe, expect, it, vi } from "vitest"
import {
  createRevenueCatRuntime,
  RevenueCatRuntimeError,
  type RevenueCatGateway,
} from "./revenueCatRuntime"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function setup(initialAppUserId: string | null = null) {
  let appUserId = initialAppUserId
  const listeners = new Set<CustomerInfoUpdateListener>()
  const gateway: RevenueCatGateway = {
    setLogLevel: vi.fn().mockResolvedValue(undefined),
    isConfigured: vi.fn().mockResolvedValue(initialAppUserId !== null),
    configure: vi.fn(({ appUserID }) => { appUserId = appUserID }),
    getAppUserID: vi.fn(() => Promise.resolve(appUserId!)),
    logIn: vi.fn((nextAppUserId) => {
      appUserId = nextAppUserId
      return Promise.resolve({})
    }),
    getOfferings: vi.fn().mockResolvedValue({ all: {}, current: null } as unknown as PurchasesOfferings),
    purchasePackage: vi.fn().mockResolvedValue({ productIdentifier: "product-1" } as MakePurchaseResult),
    purchasePackageChange: vi.fn().mockResolvedValue({ productIdentifier: "product-1" } as MakePurchaseResult),
    addCustomerInfoUpdateListener: vi.fn((listener) => { listeners.add(listener) }),
    removeCustomerInfoUpdateListener: vi.fn((listener) => { listeners.delete(listener) }),
  }
  return { gateway, listeners, runtime: createRevenueCatRuntime(gateway) }
}

describe("RevenueCat identity runtime", () => {
  it("configures for the first time with a canonical identity", async () => {
    const { gateway, runtime } = setup()

    await expect(runtime.attach({
      apiKey: "appl_public",
      appUserId: "billing_account-a",
      logLevel: "DEBUG",
    })).resolves.toEqual({ status: "READY", appUserId: "billing_account-a" })

    expect(gateway.configure).toHaveBeenCalledWith({
      apiKey: "appl_public",
      appUserID: "billing_account-a",
    })
    expect(gateway.logIn).not.toHaveBeenCalled()
  })

  it("switches identified accounts directly with logIn", async () => {
    const { gateway, runtime } = setup("billing_account-a")

    await runtime.attach({ apiKey: "goog_public", appUserId: "billing_account-b", logLevel: "WARN" })

    expect(gateway.configure).not.toHaveBeenCalled()
    expect(gateway.logIn).toHaveBeenCalledExactlyOnceWith("billing_account-b")
    expect(runtime.getAttachedAppUserId()).toBe("billing_account-b")
  })

  it("deduplicates concurrent attachment for the same identity", async () => {
    const { gateway, runtime } = setup()
    const input = { apiKey: "appl_public", appUserId: "billing_account-a", logLevel: "DEBUG" as const }

    await Promise.all([runtime.attach(input), runtime.attach(input)])

    expect(gateway.configure).toHaveBeenCalledOnce()
  })

  it("does not report the same identity ready while its native attachment is pending", async () => {
    const { gateway, runtime } = setup()
    const pending = deferred<void>()
    vi.mocked(gateway.setLogLevel).mockReturnValueOnce(pending.promise)
    const input = { apiKey: "appl_public", appUserId: "billing_account-a", logLevel: "DEBUG" as const }

    const first = runtime.attach(input)
    const second = runtime.attach(input)
    let secondResolved = false
    void second.then(() => { secondResolved = true })
    await Promise.resolve()

    expect(secondResolved).toBe(false)
    pending.resolve()
    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "READY", appUserId: "billing_account-a" },
      { status: "READY", appUserId: "billing_account-a" },
    ])
    expect(gateway.configure).toHaveBeenCalledOnce()
  })

  it("clears a failed attachment so the same identity must retry native setup", async () => {
    const { gateway, runtime } = setup("billing_account-old")
    vi.mocked(gateway.logIn).mockRejectedValueOnce(new Error("network unavailable"))
    const input = { apiKey: "goog_public", appUserId: "billing_account-a", logLevel: "WARN" as const }

    await expect(runtime.attach(input)).rejects.toThrow("network unavailable")
    expect(runtime.getAttachedAppUserId()).toBeNull()
    await expect(runtime.attach(input)).resolves.toEqual({ status: "READY", appUserId: "billing_account-a" })
    expect(gateway.logIn).toHaveBeenCalledTimes(2)
  })

  it("marks a raw offerings failure as definitely pre-purchase", async () => {
    const { gateway, runtime } = setup()
    await runtime.attach({ apiKey: "goog_public", appUserId: "billing_account-a", logLevel: "DEBUG" })
    vi.mocked(gateway.getOfferings).mockRejectedValueOnce(new Error("network unavailable"))

    await expect(runtime.purchasePackageChange("billing_account-a", {
      offeringId: "capacity_4", packageId: "$rc_annual",
      productIdentifier: "tenka_capacity_4:annual", subscriptionPeriod: "P1Y",
    }, {
      oldProductIdentifier: "tenka_capacity_2:monthly",
      replacementMode: "DEFERRED" as STORE_REPLACEMENT_MODE,
    })).rejects.toMatchObject({ code: "PRE_PURCHASE_FAILED" })
    expect(gateway.purchasePackageChange).not.toHaveBeenCalled()
  })

  it("rejects non-canonical or empty identities", async () => {
    const { gateway, runtime } = setup()

    await expect(runtime.attach({ apiKey: "appl_public", appUserId: "user@example.com", logLevel: "DEBUG" }))
      .rejects.toMatchObject({ code: "INVALID_IDENTITY" })
    expect(gateway.configure).not.toHaveBeenCalled()
  })

  it("detaches locally and removes listeners without an SDK logout operation", async () => {
    const { gateway, listeners, runtime } = setup()
    await runtime.attach({ apiKey: "appl_public", appUserId: "billing_account-a", logLevel: "DEBUG" })
    const unsubscribe = runtime.subscribeToCustomerInfo("billing_account-a", vi.fn())
    expect(listeners.size).toBe(1)

    runtime.detach()
    unsubscribe()

    expect(runtime.getAttachedAppUserId()).toBeNull()
    expect(listeners.size).toBe(0)
    expect(gateway.removeCustomerInfoUpdateListener).toHaveBeenCalledOnce()
    expect("logOut" in gateway).toBe(false)
  })

  it("discards an Offerings response after the session detaches", async () => {
    const { gateway, runtime } = setup()
    await runtime.attach({ apiKey: "appl_public", appUserId: "billing_account-a", logLevel: "DEBUG" })
    const pending = deferred<PurchasesOfferings>()
    vi.mocked(gateway.getOfferings).mockReturnValueOnce(pending.promise)

    const result = runtime.getOfferings("billing_account-a")
    runtime.detach()
    pending.resolve({ all: {}, current: null } as unknown as PurchasesOfferings)

    await expect(result).rejects.toEqual(expect.objectContaining<Partial<RevenueCatRuntimeError>>({
      code: "IDENTITY_CHANGED",
    }))
  })

  it("ignores customer information emitted for a detached session", async () => {
    const { listeners, runtime } = setup()
    const onCustomerInfo = vi.fn()
    await runtime.attach({ apiKey: "appl_public", appUserId: "billing_account-a", logLevel: "DEBUG" })
    runtime.subscribeToCustomerInfo("billing_account-a", onCustomerInfo)
    const sdkListener = [...listeners][0]

    runtime.detach()
    sdkListener({} as CustomerInfo)

    expect(onCustomerInfo).not.toHaveBeenCalled()
  })

  it("re-resolves and purchases the exact package under the attached identity", async () => {
    const { gateway, runtime } = setup()
    const selectedPackage = {
      identifier: "$rc_monthly",
      offeringIdentifier: "capacity_2",
      product: {
        identifier: "tenka_capacity_2:monthly",
        subscriptionPeriod: "P1M",
        priceString: "$259.00",
        currencyCode: "MXN",
      },
    } as PurchasesPackage
    vi.mocked(gateway.getOfferings).mockResolvedValue({
      all: {
        capacity_2: { identifier: "capacity_2", availablePackages: [selectedPackage] },
      },
      current: null,
    } as unknown as PurchasesOfferings)
    vi.mocked(gateway.purchasePackage).mockResolvedValue({
      productIdentifier: "tenka_capacity_2",
    } as MakePurchaseResult)
    await runtime.attach({ apiKey: "goog_public", appUserId: "billing_account-a", logLevel: "DEBUG" })

    await expect(runtime.purchasePackage("billing_account-a", {
      offeringId: "capacity_2",
      packageId: "$rc_monthly",
      productIdentifier: "tenka_capacity_2:monthly",
      subscriptionPeriod: "P1M",
    })).resolves.toBeUndefined()
    expect(gateway.purchasePackage).toHaveBeenCalledExactlyOnceWith(selectedPackage)
  })

  it("discards a purchase result after the session identity changes", async () => {
    const { gateway, runtime } = setup()
    const selectedPackage = {
      identifier: "$rc_monthly",
      offeringIdentifier: "capacity_2",
      product: {
        identifier: "tenka_capacity_2:monthly",
        subscriptionPeriod: "P1M",
        priceString: "$259.00",
        currencyCode: "MXN",
      },
    } as PurchasesPackage
    vi.mocked(gateway.getOfferings).mockResolvedValue({
      all: { capacity_2: { identifier: "capacity_2", availablePackages: [selectedPackage] } },
      current: null,
    } as unknown as PurchasesOfferings)
    const pending = deferred<MakePurchaseResult>()
    vi.mocked(gateway.purchasePackage).mockReturnValueOnce(pending.promise)
    await runtime.attach({ apiKey: "goog_public", appUserId: "billing_account-a", logLevel: "DEBUG" })

    const result = runtime.purchasePackage("billing_account-a", {
      offeringId: "capacity_2",
      packageId: "$rc_monthly",
      productIdentifier: "tenka_capacity_2:monthly",
      subscriptionPeriod: "P1M",
    })
    await vi.waitFor(() => expect(gateway.purchasePackage).toHaveBeenCalledOnce())
    runtime.detach()
    pending.resolve({ productIdentifier: "tenka_capacity_2" } as MakePurchaseResult)

    await expect(result).rejects.toMatchObject({ code: "PURCHASE_CONFIRMED_IDENTITY_CHANGED" })
  })

  it("re-resolves an exact package and passes product-change identity and mode", async () => {
    const { gateway, runtime } = setup()
    const selectedPackage = {
      identifier: "$rc_annual",
      offeringIdentifier: "capacity_4",
      product: {
        identifier: "tenka_capacity_4:annual",
        subscriptionPeriod: "P1Y",
        priceString: "$1,999.00",
        currencyCode: "MXN",
      },
    } as PurchasesPackage
    vi.mocked(gateway.getOfferings).mockResolvedValue({
      all: { capacity_4: { identifier: "capacity_4", availablePackages: [selectedPackage] } },
      current: null,
    } as unknown as PurchasesOfferings)
    await runtime.attach({ apiKey: "goog_public", appUserId: "billing_account-a", logLevel: "DEBUG" })

    await runtime.purchasePackageChange("billing_account-a", {
      offeringId: "capacity_4",
      packageId: "$rc_annual",
      productIdentifier: "tenka_capacity_4:annual",
      subscriptionPeriod: "P1Y",
    }, {
      oldProductIdentifier: "tenka_capacity_2:monthly",
      replacementMode: "CHARGE_PRORATED_PRICE" as STORE_REPLACEMENT_MODE,
    })

    expect(gateway.purchasePackageChange).toHaveBeenCalledExactlyOnceWith(selectedPackage, {
      oldProductIdentifier: "tenka_capacity_2:monthly",
      replacementMode: "CHARGE_PRORATED_PRICE",
    })
    expect(gateway.purchasePackage).not.toHaveBeenCalled()
  })
})
