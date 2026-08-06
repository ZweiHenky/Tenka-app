import { api } from "@/infrastructure/api/client"
import { withNetworkRetry } from "@/infrastructure/api/withNetworkRetry"

export const notificationSubscriptionApi = {
  subscribe: (data: { divisionId: string; oneSignalId: string; pushSubscriptionId: string }) =>
    withNetworkRetry(() => api.post("/api/notification-subscriptions/subscribe", data)),

  unsubscribe: (data: { divisionId: string; pushSubscriptionId: string }) =>
    withNetworkRetry(() => api.post("/api/notification-subscriptions/unsubscribe", data)),
}
