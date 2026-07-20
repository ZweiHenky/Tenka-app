import { api } from "@/infrastructure/api/client"

export const notificationSubscriptionApi = {
  subscribe: (data: { divisionId: string; oneSignalId: string; pushSubscriptionId?: string | null }) =>
    api.post("/api/notification-subscriptions/subscribe", data),

  unsubscribe: (data: { divisionId: string; oneSignalId: string }) =>
    api.post("/api/notification-subscriptions/unsubscribe", data),
}
