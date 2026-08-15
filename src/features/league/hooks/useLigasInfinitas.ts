import { useInfiniteQuery } from "@tanstack/react-query"
import { leagueApi, type LigaFilterParams } from "@/features/league/api/leagues"
import { getNextLeaguePage, HOME_LEAGUE_PAGE_SIZE } from "./leaguePagination"

export function useLigasInfinitas(filters: Omit<LigaFilterParams, "page" | "limit">, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["ligas-infinitas", filters],
    queryFn: ({ pageParam }) => leagueApi.listPaginated({ ...filters, page: pageParam, limit: HOME_LEAGUE_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: getNextLeaguePage,
    enabled,
  })
}
