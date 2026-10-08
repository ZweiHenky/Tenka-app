import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases"
import {
  BillingPackageResolutionError,
  resolveBillingPackage,
} from "@/infrastructure/billing/revenueCatPackage"
import type {
  BillingCatalog,
  BillingCatalogProduct,
  BillingInterval,
  BillingOfferingPeriod,
  BillingOfferingsResult,
  BillingStore,
} from "./types"

const INTERVALS: readonly { interval: BillingInterval; subscriptionPeriod: string }[] = [
  { interval: "MONTHLY", subscriptionPeriod: "P1M" },
  { interval: "QUARTERLY", subscriptionPeriod: "P3M" },
  { interval: "ANNUAL", subscriptionPeriod: "P1Y" },
]

export class BillingOfferingsMappingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BillingOfferingsMappingError"
  }
}

export function subscriptionPeriodForBillingInterval(interval: BillingInterval): string {
  return INTERVALS.find((candidate) => candidate.interval === interval)!.subscriptionPeriod
}

export function billingStoreForPlatform(platform: string): BillingStore | null {
  if (platform === "ios") return "APPLE"
  if (platform === "android") return "GOOGLE"
  return null
}

function unavailable(
  product: BillingCatalogProduct,
  reason: Exclude<BillingOfferingPeriod, { status: "AVAILABLE" }>['reason'],
): BillingOfferingPeriod {
  return {
    capacity: product.capacity,
    billingInterval: product.billingInterval,
    offeringId: product.revenueCatOfferingId,
    packageId: product.revenueCatPackageId,
    productIdentifier: product.revenueCatProductIdentifier,
    status: "UNAVAILABLE",
    reason,
    priceString: null,
    currencyCode: null,
  }
}

function mapProduct(
  product: BillingCatalogProduct,
  offerings: PurchasesOfferings,
  expectedSubscriptionPeriod: string,
): BillingOfferingPeriod {
  let selectedPackage: PurchasesPackage
  try {
    selectedPackage = resolveBillingPackage(offerings, {
      offeringId: product.revenueCatOfferingId,
      packageId: product.revenueCatPackageId,
      productIdentifier: product.revenueCatProductIdentifier,
      subscriptionPeriod: expectedSubscriptionPeriod,
    })
  } catch (error) {
    if (error instanceof BillingPackageResolutionError) return unavailable(product, error.reason)
    throw error
  }

  return {
    capacity: product.capacity,
    billingInterval: product.billingInterval,
    offeringId: product.revenueCatOfferingId,
    packageId: product.revenueCatPackageId,
    productIdentifier: product.revenueCatProductIdentifier,
    status: "AVAILABLE",
    priceString: selectedPackage.product.priceString,
    currencyCode: selectedPackage.product.currencyCode,
  }
}

export function mapBillingOfferings(
  catalog: BillingCatalog,
  offerings: PurchasesOfferings,
  platform: string,
): BillingOfferingsResult {
  const store = billingStoreForPlatform(platform)
  if (!store) throw new BillingOfferingsMappingError("Billing Offerings are unavailable on this platform")
  if (!catalog.available || !catalog.release) {
    throw new BillingOfferingsMappingError("The active billing catalog is unavailable")
  }

  const products = catalog.release.products.filter((product) => product.store === store && product.active)
  if (products.length !== 42) {
    throw new BillingOfferingsMappingError("The active billing catalog does not contain 42 store variants")
  }

  const matrix = new Map<string, BillingCatalogProduct>()
  for (const product of products) {
    const key = `${product.capacity}:${product.billingInterval}`
    if (matrix.has(key)) throw new BillingOfferingsMappingError(`The active billing catalog repeats ${key}`)
    matrix.set(key, product)
  }

  const capacities = Array.from({ length: 14 }, (_, index) => index + 2).map((capacity) => {
    const periods = INTERVALS.map(({ interval, subscriptionPeriod }) => {
      const product = matrix.get(`${capacity}:${interval}`)
      if (!product) throw new BillingOfferingsMappingError(`The active billing catalog is missing ${capacity}:${interval}`)
      return mapProduct(product, offerings, subscriptionPeriod)
    })
    return {
      capacity,
      offeringId: `capacity_${capacity}`,
      periods,
    }
  })

  return {
    store,
    environment: catalog.environment,
    releaseVersion: catalog.release.version,
    capacities,
    availableVariantCount: capacities.flatMap(({ periods }) => periods)
      .filter(({ status }) => status === "AVAILABLE").length,
  }
}
