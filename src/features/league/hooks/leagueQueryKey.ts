import type { LigaFilterParams } from "@/features/league/api/leagues"

export function leagueInfiniteQueryKey(filters: Omit<LigaFilterParams, "page" | "limit">) {
  return ["ligas-infinitas", filters] as const
}

export function isNearbyLeagueQuery(queryKey: readonly unknown[]): boolean {
  const filters = queryKey[0] === "ligas-infinitas" && typeof queryKey[1] === "object" && queryKey[1] !== null
    ? queryKey[1] as Record<string, unknown>
    : undefined
  return filters?.latitude !== undefined || filters?.longitude !== undefined
}
