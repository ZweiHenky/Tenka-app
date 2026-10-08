import { Platform } from "react-native"
import { useQuery } from "@tanstack/react-query"
import type { UserRole } from "@/domain/interfaces/user"
import { mapBillingOfferings, billingStoreForPlatform } from "@/features/billing/offerings"
import { billingKeys } from "@/features/billing/hooks/queryKeys"
import type { BillingCatalog } from "@/features/billing/types"
import { revenueCatClient } from "@/infrastructure/billing/revenueCatNative"

type UseBillingOfferingsInput = {
  appUserId: string | null | undefined
  catalog: BillingCatalog | null | undefined
  role: UserRole | null | undefined
  enabled?: boolean
}

export function useBillingOfferings({
  appUserId,
  catalog,
  role,
  enabled = true,
}: UseBillingOfferingsInput) {
  const platform = Platform.OS
  const store = billingStoreForPlatform(platform)
  const release = catalog?.available ? catalog.release : null
  const queryKey = appUserId && release && store
    ? billingKeys.offerings(appUserId, release.version, platform as "ios" | "android", catalog!.environment)
    : [...billingKeys.all, "offerings", "unavailable"] as const

  return useQuery({
    queryKey,
    queryFn: async () => {
      const attachment = await revenueCatClient.attach(appUserId!)
      if (attachment.status !== "READY") throw new Error("RevenueCat is unavailable on this platform")
      const offerings = await revenueCatClient.getOfferings(appUserId!)
      return mapBillingOfferings(catalog!, offerings, platform)
    },
    enabled: enabled && role === "LIGA" && !!appUserId && !!release && !!store,
    staleTime: 5 * 60_000,
  })
}
