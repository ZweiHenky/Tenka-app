import { api } from "@/infrastructure/api/client"
import type { AccountQuota } from "@/features/users/quota"

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export const userApi = {
  getAccountQuota: (userId: string) =>
    api.get<ApiRes<AccountQuota>>(`/api/users/${userId}/quota`).then((r) => r.data.data!),
  activateLeagueRole: () =>
    api
      .post<ApiRes<{ id: string; rol: string }>>("/api/users/me/activate-league-role")
      .then((r) => r.data.data!),
  updatePhoneVisibility: (showPhoneInPublicLeague: boolean) =>
    api
      .patch<ApiRes<{ id: string; showPhoneInPublicLeague: boolean }>>("/api/users/me/phone-visibility", { showPhoneInPublicLeague })
      .then((r) => r.data.data!),
  deleteAccount: (email: string) =>
    api.delete<ApiRes<undefined>>("/api/users/me", { data: { email } }).then((r) => r.data),
}
