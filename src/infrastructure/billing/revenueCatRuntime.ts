import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  MakePurchaseResult,
  PurchasesPackage,
  PurchasesOfferings,
  STORE_REPLACEMENT_MODE,
  StoreProductChangeInfo,
} from "react-native-purchases"
import {
  BillingPackageResolutionError,
  resolveBillingPackage,
  type BillingPackageSelection,
} from "./revenueCatPackage"

export type RevenueCatRuntimeErrorCode =
  | "INVALID_IDENTITY"
  | "DETACHED"
  | "IDENTITY_CHANGED"
  | "IDENTITY_MISMATCH"
  | "PRE_PURCHASE_FAILED"
  | "PURCHASE_CONFIRMED_IDENTITY_CHANGED"

export class RevenueCatRuntimeError extends Error {
  constructor(
    public readonly code: RevenueCatRuntimeErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "RevenueCatRuntimeError"
  }
}

export interface RevenueCatGateway {
  setLogLevel(level: "DEBUG" | "WARN"): Promise<void>
  isConfigured(): Promise<boolean>
  configure(configuration: { apiKey: string; appUserID: string }): void
  getAppUserID(): Promise<string>
  logIn(appUserId: string): Promise<unknown>
  getOfferings(): Promise<PurchasesOfferings>
  purchasePackage(aPackage: PurchasesPackage): Promise<MakePurchaseResult>
  purchasePackageChange(
    aPackage: PurchasesPackage,
    productChangeInfo: StoreProductChangeInfo,
  ): Promise<MakePurchaseResult>
  addCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): void
  removeCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): void
}

export type RevenueCatAttachInput = {
  apiKey: string
  appUserId: string
  logLevel: "DEBUG" | "WARN"
}

export function createRevenueCatRuntime(gateway: RevenueCatGateway) {
  let generation = 0
  let attachedAppUserId: string | null = null
  let tail: Promise<unknown> = Promise.resolve()
  const listeners = new Set<CustomerInfoUpdateListener>()
  const pendingAttach = new Map<string, Promise<{ status: "READY"; appUserId: string }>>()

  const clearListeners = () => {
    for (const listener of listeners) gateway.removeCustomerInfoUpdateListener(listener)
    listeners.clear()
  }

  const assertCurrent = (expectedGeneration: number, expectedAppUserId: string) => {
    if (generation !== expectedGeneration) {
      throw new RevenueCatRuntimeError("IDENTITY_CHANGED", "RevenueCat identity changed during the operation")
    }
    if (attachedAppUserId !== expectedAppUserId) {
      throw new RevenueCatRuntimeError("DETACHED", "RevenueCat is detached from the application session")
    }
  }

  const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.catch(() => undefined).then(operation)
    tail = result.then(() => undefined, () => undefined)
    return result
  }

  const attach = (input: RevenueCatAttachInput): Promise<{ status: "READY"; appUserId: string }> => {
    const appUserId = input.appUserId.trim()
    if (!appUserId.startsWith("billing_") || appUserId.length > 100 || appUserId.includes("/")) {
      return Promise.reject(new RevenueCatRuntimeError(
        "INVALID_IDENTITY",
        "RevenueCat requires a canonical billing identity",
      ))
    }
    const signature = `${input.apiKey}:${appUserId}`
    const pending = pendingAttach.get(signature)
    if (pending) return pending
    if (attachedAppUserId === appUserId) return Promise.resolve({ status: "READY", appUserId })

    generation += 1
    const operationGeneration = generation
    attachedAppUserId = appUserId
    clearListeners()

    const operation = enqueue(async () => {
      try {
        assertCurrent(operationGeneration, appUserId)
        await gateway.setLogLevel(input.logLevel)
        assertCurrent(operationGeneration, appUserId)

        const configured = await gateway.isConfigured()
        assertCurrent(operationGeneration, appUserId)
        if (!configured) {
          gateway.configure({ apiKey: input.apiKey, appUserID: appUserId })
        } else if (await gateway.getAppUserID() !== appUserId) {
          assertCurrent(operationGeneration, appUserId)
          await gateway.logIn(appUserId)
        }

        assertCurrent(operationGeneration, appUserId)
        const confirmedAppUserId = await gateway.getAppUserID()
        assertCurrent(operationGeneration, appUserId)
        if (confirmedAppUserId !== appUserId) {
          throw new RevenueCatRuntimeError("IDENTITY_MISMATCH", "RevenueCat did not confirm the expected identity")
        }
        return { status: "READY" as const, appUserId }
      } catch (error) {
        if (generation === operationGeneration && attachedAppUserId === appUserId) attachedAppUserId = null
        throw error
      }
    })

    pendingAttach.set(signature, operation)
    void operation.finally(() => {
      if (pendingAttach.get(signature) === operation) pendingAttach.delete(signature)
    }).catch(() => undefined)
    return operation
  }

  const detach = () => {
    generation += 1
    attachedAppUserId = null
    clearListeners()
  }

  const getOfferings = async (expectedAppUserId: string): Promise<PurchasesOfferings> => {
    const operationGeneration = generation
    assertCurrent(operationGeneration, expectedAppUserId)
    const offerings = await gateway.getOfferings()
    assertCurrent(operationGeneration, expectedAppUserId)
    return offerings
  }

  const purchasePackage = async (
    expectedAppUserId: string,
    selection: BillingPackageSelection,
  ): Promise<void> => {
    const operationGeneration = generation
    assertCurrent(operationGeneration, expectedAppUserId)
    const offerings = await gateway.getOfferings()
    assertCurrent(operationGeneration, expectedAppUserId)
    const selectedPackage = resolveBillingPackage(offerings, selection)
    await gateway.purchasePackage(selectedPackage)
    try {
      assertCurrent(operationGeneration, expectedAppUserId)
    } catch {
      throw new RevenueCatRuntimeError(
        "PURCHASE_CONFIRMED_IDENTITY_CHANGED",
        "RevenueCat identity changed after the store confirmed the purchase",
      )
    }
  }

  const purchasePackageChange = async (
    expectedAppUserId: string,
    selection: BillingPackageSelection,
    change: {
      oldProductIdentifier: string
      replacementMode: STORE_REPLACEMENT_MODE
    },
  ): Promise<void> => {
    const operationGeneration = generation
    assertCurrent(operationGeneration, expectedAppUserId)
    let selectedPackage: PurchasesPackage
    try {
      const offerings = await gateway.getOfferings()
      assertCurrent(operationGeneration, expectedAppUserId)
      selectedPackage = resolveBillingPackage(offerings, selection)
    } catch (error) {
      if (error instanceof RevenueCatRuntimeError || error instanceof BillingPackageResolutionError) throw error
      throw new RevenueCatRuntimeError("PRE_PURCHASE_FAILED", "RevenueCat failed before opening the store")
    }
    await gateway.purchasePackageChange(selectedPackage, change)
    try {
      assertCurrent(operationGeneration, expectedAppUserId)
    } catch {
      throw new RevenueCatRuntimeError(
        "PURCHASE_CONFIRMED_IDENTITY_CHANGED",
        "RevenueCat identity changed after the store confirmed the purchase",
      )
    }
  }

  const subscribeToCustomerInfo = (
    expectedAppUserId: string,
    listener: (customerInfo: CustomerInfo) => void,
  ): (() => void) => {
    const listenerGeneration = generation
    assertCurrent(listenerGeneration, expectedAppUserId)
    const guardedListener: CustomerInfoUpdateListener = (customerInfo) => {
      if (generation === listenerGeneration && attachedAppUserId === expectedAppUserId) listener(customerInfo)
    }
    listeners.add(guardedListener)
    gateway.addCustomerInfoUpdateListener(guardedListener)
    return () => {
      if (!listeners.delete(guardedListener)) return
      gateway.removeCustomerInfoUpdateListener(guardedListener)
    }
  }

  return {
    attach,
    detach,
    getAttachedAppUserId: () => attachedAppUserId,
    getOfferings,
    purchasePackage,
    purchasePackageChange,
    subscribeToCustomerInfo,
  }
}
