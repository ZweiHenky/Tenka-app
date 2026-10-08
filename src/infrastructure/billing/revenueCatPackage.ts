import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases"

export type BillingPackageResolutionReason =
  | "MISSING_OFFERING"
  | "OFFERING_MISMATCH"
  | "MISSING_PACKAGE"
  | "DUPLICATE_PACKAGE"
  | "PRODUCT_MISMATCH"
  | "PERIOD_MISMATCH"
  | "INVALID_PRICE"

export class BillingPackageResolutionError extends Error {
  constructor(public readonly reason: BillingPackageResolutionReason) {
    super(`Billing package resolution failed (${reason})`)
    this.name = "BillingPackageResolutionError"
  }
}

export type BillingPackageSelection = {
  offeringId: string
  packageId: string
  productIdentifier: string
  subscriptionPeriod: string
}

export function resolveBillingPackage(
  offerings: PurchasesOfferings,
  selection: BillingPackageSelection,
): PurchasesPackage {
  const offering = offerings.all[selection.offeringId]
  if (!offering) throw new BillingPackageResolutionError("MISSING_OFFERING")
  if (offering.identifier !== selection.offeringId) {
    throw new BillingPackageResolutionError("OFFERING_MISMATCH")
  }
  const packages = offering.availablePackages.filter(
    (candidate) => candidate.identifier === selection.packageId,
  )
  if (packages.length === 0) throw new BillingPackageResolutionError("MISSING_PACKAGE")
  if (packages.length > 1) throw new BillingPackageResolutionError("DUPLICATE_PACKAGE")

  const selectedPackage = packages[0]
  if (selectedPackage.offeringIdentifier !== selection.offeringId) {
    throw new BillingPackageResolutionError("OFFERING_MISMATCH")
  }
  if (selectedPackage.product.identifier !== selection.productIdentifier) {
    throw new BillingPackageResolutionError("PRODUCT_MISMATCH")
  }
  if (selectedPackage.product.subscriptionPeriod !== selection.subscriptionPeriod) {
    throw new BillingPackageResolutionError("PERIOD_MISMATCH")
  }
  if (!selectedPackage.product.priceString.trim() || !selectedPackage.product.currencyCode.trim()) {
    throw new BillingPackageResolutionError("INVALID_PRICE")
  }
  return selectedPackage
}
