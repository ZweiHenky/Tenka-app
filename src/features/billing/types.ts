import type { UserRole } from "@/domain/interfaces/user"

export type BillingStore = "APPLE" | "GOOGLE"
export type BillingInterval = "MONTHLY" | "QUARTERLY" | "ANNUAL"
export type BillingEnvironment = "PREVIEW" | "PRODUCTION"
export type BillingOperationalMode = "ENABLED" | "PURCHASES_PAUSED"
export type EffectiveBillingAccess = "FREE" | "PAID" | "LOCAL_GRACE" | "MIGRATION" | "ENTERPRISE" | "ADMIN"
export type BillingChangeDirection = "UPGRADE" | "DOWNGRADE" | "SAME"
export type BillingChangeTiming = "IMMEDIATE" | "DEFERRED" | "TWO_STEP"
export type BillingChangeOperationStatus =
  | "DRAFT"
  | "FIRST_PURCHASE_PENDING"
  | "FIRST_VERIFICATION_PENDING"
  | "FIRST_VERIFIED"
  | "SECOND_STEP_PENDING"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED"
  | "ABANDONED"
export type BillingChangePreviewReason =
  | "NO_ACTIVE_SUBSCRIPTION"
  | "NO_PAID_ACCESS"
  | "LOCAL_GRACE"
  | "EVIDENCE_INVALID"
  | "CURRENT_VARIANT_UNKNOWN"
  | "UNSUPPORTED_STORE"
  | "NO_CHANGE"
export type BillingNextAction =
  | "PURCHASE_FIRST_STEP"
  | "WAIT_FOR_FIRST_VERIFICATION"
  | "SCHEDULE_PERIOD_CHANGE"
  | "WAIT_FOR_SCHEDULE_VERIFICATION"
export type BillingChangeExecutionStep = "FIRST" | "FINAL"
export type BillingChangeReplacementMode = "CHARGE_PRORATED_PRICE" | "DEFERRED"

export interface BillingOperationalControl {
  environment: BillingEnvironment
  mode: BillingOperationalMode
  reason: string
  changedAt: string
  version: number
}

export interface UpdateBillingOperationalControlInput {
  mode: BillingOperationalMode
  reason: string
  expectedVersion: number
}

export interface FreeManagementGrant {
  divisionId: string
  divisionName: string
  leagueId: string
  leagueName: string
  grantedAt: string
}

export interface SubscriptionManagement {
  url: string
  store: BillingStore
  storeProductId?: string | null
  willRenew?: boolean | null
}

export interface BillingChangeVariant {
  variantId: string
  logicalProductId: string
  billingInterval: BillingInterval
  capacity: number
  storeProductId: string
}

export interface BillingChangePreview {
  eligible: boolean
  reason: BillingChangePreviewReason | null
  store: BillingStore
  current: BillingChangeVariant | null
  target: BillingChangeVariant
  direction: BillingChangeDirection | null
  timing: BillingChangeTiming | null
  requiresRenewalSelection: boolean
  firstStep: BillingChangeVariant | null
  previewFingerprint: string
  operationId: string | null
  operationStatus: BillingChangeOperationStatus | null
  operationVersion: number | null
  activeAttempt: BillingCheckoutAttempt | null
  nextAction: BillingNextAction | null
}

export interface BillingChangeOperation {
  id: string
  status: BillingChangeOperationStatus
  version: number
}

export interface BillingActiveChangeOperation {
  id: string
  status: BillingChangeOperationStatus
  version: number
  lastErrorCode: string | null
  current: BillingChangeVariant
  target: BillingChangeVariant
  firstStep: BillingChangeVariant
  direction: "UPGRADE"
  timing: "TWO_STEP"
  requiresRenewalSelection: boolean
  activeAttempt: BillingActiveChangeAttempt | null
}

export interface BillingActiveChangeAttempt {
  id: string
  status: BillingCheckoutAttemptStatus
  purpose: "PRODUCT_CHANGE_FIRST_STEP" | "PRODUCT_CHANGE_FINAL_STEP"
  version: number
}

export interface BillingState {
  role: UserRole
  effectiveAccess: EffectiveBillingAccess
  billingAccountId: string | null
  revenueCatAppUserId: string | null
  effectiveCapacity: number
  limits: {
    teams: number | null
    leagues: number | null
    divisions: number | null
  }
  freeManagementGrant: FreeManagementGrant | null
  purchasesEnabled: boolean
  subscriptionManagement?: SubscriptionManagement | null
  nextAction?: BillingNextAction | null
  migrationOverlayActive?: boolean
  migrationDeadline?: string | null
  migrationPaused?: boolean
  migrationSelectedDivisionId?: string | null
  migrationDivisions?: { id: string; name: string; leagueName: string }[]
  activeChangeOperation?: BillingActiveChangeOperation | null
}

export interface BillingCatalogProduct {
  id: string
  logicalProductId: string
  store: BillingStore
  storeProductId: string
  basePlanId: string | null
  revenueCatOfferingId: string
  revenueCatPackageId: string
  revenueCatProductIdentifier: string
  capacity: number
  billingInterval: BillingInterval
  intervalMonths: number
  active: boolean
}

export interface BillingCatalogRelease {
  id: string
  version: string
  products: BillingCatalogProduct[]
}

export interface BillingCatalog {
  available: boolean
  environment: BillingEnvironment
  release: BillingCatalogRelease | null
  purchasesEnabled: boolean
}

export type BillingOfferingUnavailableReason =
  | "MISSING_OFFERING"
  | "OFFERING_MISMATCH"
  | "MISSING_PACKAGE"
  | "DUPLICATE_PACKAGE"
  | "PRODUCT_MISMATCH"
  | "PERIOD_MISMATCH"
  | "INVALID_PRICE"

export type BillingOfferingPeriod = {
  capacity: number
  billingInterval: BillingInterval
  offeringId: string
  packageId: string
  productIdentifier: string
} & (
  | {
    status: "AVAILABLE"
    priceString: string
    currencyCode: string
  }
  | {
    status: "UNAVAILABLE"
    reason: BillingOfferingUnavailableReason
    priceString: null
    currencyCode: null
  }
)

export interface BillingOfferingCapacity {
  capacity: number
  offeringId: string
  periods: BillingOfferingPeriod[]
}

export interface BillingOfferingsResult {
  store: BillingStore
  environment: BillingEnvironment
  releaseVersion: string
  capacities: BillingOfferingCapacity[]
  availableVariantCount: number
}

export interface BillingPurchaseSelection {
  id: string
  logicalProductId: string
  billingInterval: BillingInterval
  targetCapacity: number
  status: "DRAFT" | "LOCKED" | "APPLIED" | "SUPERSEDED"
  version: number
  lockedAt: string | null
  items: { slotNumber: number; divisionId: string; fixedByFreeGrant: boolean }[]
  createdAt: string
  updatedAt: string
}

export type BillingCheckoutAttemptStatus =
  | "PREPARED"
  | "STORE_PENDING"
  | "VERIFICATION_PENDING"
  | "CANCEL_REPORTED"
  | "VERIFYING"
  | "VERIFIED"
  | "CANCELED"
  | "REJECTED"
  | "OWNERSHIP_CONFLICT"
  | "ABANDONED"

export interface BillingCheckoutAttempt {
  id: string
  purchaseSelectionId: string | null
  changeOperationId: string | null
  purpose: "INITIAL_PURCHASE" | "PRODUCT_CHANGE_FIRST_STEP" | "PRODUCT_CHANGE_FINAL_STEP"
  store: "GOOGLE"
  logicalProductId: string
  billingInterval: BillingInterval
  targetCapacity: number
  offeringId: string
  packageId: string
  productIdentifier: string
  basePlanId: string
  status: BillingCheckoutAttemptStatus
  version: number
  startedAt: string
  nextVerificationAt: string | null
  terminalAt: string | null
  lastErrorCode: string | null
}

export interface BillingChangeCheckoutAttempt {
  id: string
  status: BillingCheckoutAttemptStatus
  purpose: "PRODUCT_CHANGE_FIRST_STEP" | "PRODUCT_CHANGE_FINAL_STEP"
  version: number
  logicalProductId: string
  billingInterval: BillingInterval
  targetCapacity: number
  offeringId: string
  packageId: string
  productIdentifier: string
  basePlanId: string
  startedAt: string
  nextVerificationAt: string | null
}

export type BillingChangeExecutionInstruction =
  | {
    step: "FIRST"
    replacementMode: "CHARGE_PRORATED_PRICE"
    sourceVariant: BillingChangeVariant
    targetVariant: BillingChangeVariant
  }
  | {
    step: "FINAL"
    replacementMode: "DEFERRED"
    sourceVariant: BillingChangeVariant
    targetVariant: BillingChangeVariant
  }

export interface BillingChangeExecutionResponse {
  operation: BillingChangeOperation
  attempt: BillingChangeCheckoutAttempt
  instruction: BillingChangeExecutionInstruction
}

export type BillingCheckoutOutcome =
  | "SDK_CONFIRMED"
  | "PENDING"
  | "CANCELED"
  | "ALREADY_PURCHASED"
  | "OWNERSHIP_CONFLICT"
  | "CONFIRMATION_AMBIGUOUS"
