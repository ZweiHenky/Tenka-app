import { api } from "@/infrastructure/api/client"

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export const userApi = {
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
