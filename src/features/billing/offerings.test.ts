import type { PurchasesOfferings } from "react-native-purchases"
import { describe, expect, it } from "vitest"
import { resolveBillingPackage } from "@/infrastructure/billing/revenueCatPackage"
import { mapBillingOfferings } from "./offerings"
import type { BillingCatalog, BillingCatalogProduct, BillingInterval, BillingStore } from "./types"

const intervals = [
  { interval: "MONTHLY" as const, packageId: "$rc_monthly", suffix: "monthly", period: "P1M" },
  { interval: "QUARTERLY" as const, packageId: "$rc_three_month", suffix: "quarterly", period: "P3M" },
  { interval: "ANNUAL" as const, packageId: "$rc_annual", suffix: "annual", period: "P1Y" },
]

function productId(store: BillingStore, capacity: number, suffix: string) {
  return store === "APPLE"
    ? `studio.tenka.capacity${capacity}.${suffix}.v1`
    : `tenka_capacity_${capacity}:${suffix}`
}

function catalog(): BillingCatalog {
  const products: BillingCatalogProduct[] = []
  for (let capacity = 2; capacity <= 15; capacity += 1) {
    for (const store of ["APPLE", "GOOGLE"] as const) {
      for (const { interval, packageId, suffix } of intervals) {
        products.push({
          id: `${store}-${capacity}-${interval}`,
          logicalProductId: `tenka_capacity_${capacity}`,
          store,
          storeProductId: store === "APPLE"
            ? productId(store, capacity, suffix)
            : `tenka_capacity_${capacity}`,
          basePlanId: store === "GOOGLE" ? suffix : null,
          revenueCatOfferingId: `capacity_${capacity}`,
          revenueCatPackageId: packageId,
          revenueCatProductIdentifier: productId(store, capacity, suffix),
          capacity,
          billingInterval: interval,
          intervalMonths: interval === "MONTHLY" ? 1 : interval === "QUARTERLY" ? 3 : 12,
          active: true,
        })
      }
    }
  }
  return {
    available: true,
    environment: "PREVIEW",
    release: { id: "release-1", version: "2026-09-mx-v1", products },
    purchasesEnabled: false,
  }
}

type FixturePackage = {
  identifier: string
  offeringIdentifier: string
  product: {
    identifier: string
    subscriptionPeriod: string | null
    priceString: string
    currencyCode: string
  }
}

type FixtureOffering = {
  identifier: string
  availablePackages: FixturePackage[]
}

function offerings(store: BillingStore) {
  const all: Record<string, FixtureOffering> = {}
  for (let capacity = 2; capacity <= 15; capacity += 1) {
    const offeringId = `capacity_${capacity}`
    all[offeringId] = {
      identifier: offeringId,
      availablePackages: intervals.map(({ packageId, suffix, period }) => ({
        identifier: packageId,
        offeringIdentifier: offeringId,
        product: {
          identifier: productId(store, capacity, suffix),
          subscriptionPeriod: period,
          priceString: capacity === 2 && suffix === "monthly" ? "$259.00" : `MX$${capacity}-${suffix}`,
          currencyCode: "MXN",
        },
      })),
    }
  }
  return { all, current: { identifier: "not-used", availablePackages: [] } }
}

function mapFixture(store: BillingStore, fixture = offerings(store)) {
  return mapBillingOfferings(
    catalog(),
    fixture as unknown as PurchasesOfferings,
    store === "APPLE" ? "ios" : "android",
  )
}

function packageFor(fixture: ReturnType<typeof offerings>, capacity: number, interval: BillingInterval) {
  const packageId = intervals.find((candidate) => candidate.interval === interval)!.packageId
  return fixture.all[`capacity_${capacity}`].availablePackages.find((item) => item.identifier === packageId)!
}

describe("mapBillingOfferings", () => {
  it.each(["APPLE", "GOOGLE"] as const)("maps all 42 %s variants from offerings.all", (store) => {
    const result = mapFixture(store)

    expect(result.store).toBe(store)
    expect(result.capacities).toHaveLength(14)
    expect(result.capacities.flatMap(({ periods }) => periods)).toHaveLength(42)
    expect(result.availableVariantCount).toBe(42)
    expect(result.capacities[0].periods[0]).toMatchObject({
      status: "AVAILABLE",
      priceString: "$259.00",
      currencyCode: "MXN",
    })
  })

  it("keeps one missing package unavailable without hiding the other variants", () => {
    const fixture = offerings("APPLE")
    fixture.all.capacity_2.availablePackages = fixture.all.capacity_2.availablePackages
      .filter(({ identifier }) => identifier !== "$rc_monthly")

    const result = mapFixture("APPLE", fixture)
    const periods = result.capacities.flatMap((capacity) => capacity.periods)

    expect(result.availableVariantCount).toBe(41)
    expect(periods.find((period) => period.capacity === 2 && period.billingInterval === "MONTHLY"))
      .toMatchObject({ status: "UNAVAILABLE", reason: "MISSING_PACKAGE", priceString: null })
  })

  it.each([
    ["MISSING_OFFERING", (fixture: ReturnType<typeof offerings>) => { delete fixture.all.capacity_2 }],
    ["OFFERING_MISMATCH", (fixture: ReturnType<typeof offerings>) => { fixture.all.capacity_2.identifier = "wrong" }],
    ["DUPLICATE_PACKAGE", (fixture: ReturnType<typeof offerings>) => {
      fixture.all.capacity_2.availablePackages.push({ ...fixture.all.capacity_2.availablePackages[0] })
    }],
    ["PRODUCT_MISMATCH", (fixture: ReturnType<typeof offerings>) => {
      packageFor(fixture, 2, "MONTHLY").product.identifier = "wrong"
    }],
    ["PERIOD_MISMATCH", (fixture: ReturnType<typeof offerings>) => {
      packageFor(fixture, 2, "MONTHLY").product.subscriptionPeriod = "P1Y"
    }],
    ["INVALID_PRICE", (fixture: ReturnType<typeof offerings>) => {
      packageFor(fixture, 2, "MONTHLY").product.priceString = " "
    }],
  ] as const)("marks a variant as %s", (reason, mutate) => {
    const fixture = offerings("APPLE")
    mutate(fixture)

    const first = mapFixture("APPLE", fixture).capacities[0].periods[0]
    expect(first).toMatchObject({ status: "UNAVAILABLE", reason })
  })

  it("rejects an incomplete authoritative store matrix", () => {
    const incomplete = catalog()
    incomplete.release!.products = incomplete.release!.products.slice(1)

    expect(() => mapBillingOfferings(
      incomplete,
      offerings("APPLE") as unknown as PurchasesOfferings,
      "ios",
    )).toThrow("42 store variants")
  })

  it("does not expose numeric or normalized price fields", () => {
    const period = mapFixture("APPLE").capacities[0].periods[0]

    expect(Object.keys(period)).not.toContain("price")
    expect(Object.keys(period)).not.toContain("pricePerMonthString")
    expect(period.priceString).toBe("$259.00")
  })

  it("resolves the exact fresh package used for a purchase", () => {
    const fixture = offerings("GOOGLE")
    const selected = packageFor(fixture, 2, "MONTHLY")
    expect(resolveBillingPackage(fixture as unknown as PurchasesOfferings, {
      offeringId: "capacity_2",
      packageId: "$rc_monthly",
      productIdentifier: "tenka_capacity_2:monthly",
      subscriptionPeriod: "P1M",
    })).toBe(selected)
  })

  it("rejects a purchase package whose product changed after display mapping", () => {
    const fixture = offerings("GOOGLE")
    packageFor(fixture, 2, "MONTHLY").product.identifier = "tenka_capacity_3:monthly"
    expect(() => resolveBillingPackage(fixture as unknown as PurchasesOfferings, {
      offeringId: "capacity_2",
      packageId: "$rc_monthly",
      productIdentifier: "tenka_capacity_2:monthly",
      subscriptionPeriod: "P1M",
    })).toThrow("PRODUCT_MISMATCH")
  })
})
