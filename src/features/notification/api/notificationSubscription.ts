import { api } from "@/infrastructure/api/client"
import { withNetworkRetry } from "@/infrastructure/api/withNetworkRetry"

export type CanonicalNotificationSubscription = {
  divisionId: string
  oneSignalId: string
  pushSubscriptionId: string | null
  userId: string | null
}

export const notificationSubscriptionApi = {
  sync: (data: { oneSignalId: string; pushSubscriptionId: string; divisionIds: string[] }) =>
    withNetworkRetry(() => api.post<{ success: true; data: CanonicalNotificationSubscription[] }>("/api/notification-subscriptions/sync", data)),

  subscribe: (data: { divisionId: string; oneSignalId: string; pushSubscriptionId: string }) =>
    withNetworkRetry(() => api.post("/api/notification-subscriptions/subscribe", data)),

  unsubscribe: (data: { divisionId: string; oneSignalId: string; pushSubscriptionId: string }) =>
    withNetworkRetry(() => api.post("/api/notification-subscriptions/unsubscribe", data)),
}
