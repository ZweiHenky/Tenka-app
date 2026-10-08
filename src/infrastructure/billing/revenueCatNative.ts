import { Platform } from "react-native"
import Purchases, {
  LOG_LEVEL,
  STORE_REPLACEMENT_MODE,
  type CustomerInfoUpdateListener,
} from "react-native-purchases"
import { env } from "@/infrastructure/config/env"
import { revenueCatApiKeyForPlatform, revenueCatLogLevel } from "./revenueCatConfig"
import { createRevenueCatRuntime, type RevenueCatGateway } from "./revenueCatRuntime"
import type { BillingPackageSelection } from "./revenueCatPackage"

const gateway: RevenueCatGateway = {
  setLogLevel: (level) => Purchases.setLogLevel(level === "DEBUG" ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN),
  isConfigured: () => Purchases.isConfigured(),
  configure: (configuration) => Purchases.configure(configuration),
  getAppUserID: () => Purchases.getAppUserID(),
  logIn: (appUserId) => Purchases.logIn(appUserId),
  getOfferings: () => Purchases.getOfferings(),
  purchasePackage: (aPackage) => Purchases.purchasePackage(aPackage),
  purchasePackageChange: (aPackage, productChangeInfo) =>
    Purchases.purchasePackage(aPackage, null, productChangeInfo),
  addCustomerInfoUpdateListener: (listener: CustomerInfoUpdateListener) => {
    Purchases.addCustomerInfoUpdateListener(listener)
  },
  removeCustomerInfoUpdateListener: (listener: CustomerInfoUpdateListener) => {
    Purchases.removeCustomerInfoUpdateListener(listener)
  },
}

const runtime = createRevenueCatRuntime(gateway)

export const revenueCatClient = {
  async attach(appUserId: string) {
    const apiKey = revenueCatApiKeyForPlatform(Platform.OS, {
      apple: env.REVENUECAT_APPLE_API_KEY,
      google: env.REVENUECAT_GOOGLE_API_KEY,
    })
    if (!apiKey) {
      runtime.detach()
      return { status: "UNSUPPORTED" as const }
    }
    return runtime.attach({ apiKey, appUserId, logLevel: revenueCatLogLevel(env.APP_ENV) })
  },
  detach: runtime.detach,
  getAttachedAppUserId: runtime.getAttachedAppUserId,
  getOfferings: runtime.getOfferings,
  subscribeToCustomerInfo: runtime.subscribeToCustomerInfo,
}

export class GooglePlaySandboxPurchaseError extends Error {
  constructor(public readonly code: "SANDBOX_DISABLED") {
    super("Google Play sandbox purchases are disabled")
    this.name = "GooglePlaySandboxPurchaseError"
  }
}

export const developmentGooglePlaySandboxClient = {
  async purchase(input: {
    appUserId: string
    role: string
    catalogEnvironment: string
    selection: BillingPackageSelection
  }) {
    if ((env.APP_ENV !== "local" && env.APP_ENV !== "preview")
      || Platform.OS !== "android"
      || !env.BILLING_GOOGLE_SANDBOX_PURCHASES
      || input.role !== "LIGA"
      || input.catalogEnvironment !== "PREVIEW") {
      throw new GooglePlaySandboxPurchaseError("SANDBOX_DISABLED")
    }
    const attached = await revenueCatClient.attach(input.appUserId)
    if (attached.status !== "READY") throw new GooglePlaySandboxPurchaseError("SANDBOX_DISABLED")
    return runtime.purchasePackage(input.appUserId, input.selection)
  },
}

export const developmentGooglePlayProductChangeClient = {
  async purchasePackageChange(input: {
    appUserId: string
    role: string
    catalogEnvironment: string
    selection: BillingPackageSelection
    oldProductIdentifier: string
    replacementMode: "CHARGE_PRORATED_PRICE" | "DEFERRED"
  }) {
    if ((env.APP_ENV !== "local" && env.APP_ENV !== "preview")
      || Platform.OS !== "android"
      || !env.BILLING_GOOGLE_SANDBOX_PURCHASES
      || input.role !== "LIGA"
      || input.catalogEnvironment !== "PREVIEW") {
      throw new GooglePlaySandboxPurchaseError("SANDBOX_DISABLED")
    }
    const attached = await revenueCatClient.attach(input.appUserId)
    if (attached.status !== "READY") throw new GooglePlaySandboxPurchaseError("SANDBOX_DISABLED")
    return runtime.purchasePackageChange(input.appUserId, input.selection, {
      oldProductIdentifier: input.oldProductIdentifier,
      replacementMode: input.replacementMode === "CHARGE_PRORATED_PRICE"
        ? STORE_REPLACEMENT_MODE.CHARGE_PRORATED_PRICE
        : STORE_REPLACEMENT_MODE.DEFERRED,
    })
  },
}
