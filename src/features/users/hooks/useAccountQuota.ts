import { useQuery } from "@tanstack/react-query"
import { userApi } from "@/features/users/api/users"
import { accountQuotaQueryKey } from "@/features/users/quota"

export function useAccountQuota(userId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: accountQuotaQueryKey(userId ?? "anonymous"),
    queryFn: () => userApi.getAccountQuota(userId!),
    enabled: enabled && !!userId,
    staleTime: 30_000,
  })
}
