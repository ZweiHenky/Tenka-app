import { api } from "@/infrastructure/api/client"

interface ApiRes<T> {
  success: boolean
  data?: T
  message?: string
}

export const userApi = {
  updatePhoneVisibility: (showPhoneInPublicLeague: boolean) =>
    api
      .patch<ApiRes<{ id: string; showPhoneInPublicLeague: boolean }>>("/api/users/me/phone-visibility", { showPhoneInPublicLeague })
      .then((r) => r.data.data!),
}
