import { useInfiniteQuery } from "@tanstack/react-query"
import { leagueApi, type LigaFilterParams } from "@/features/league/api/leagues"

const LIMIT = 5

export function useLigasInfinitas(filters: Omit<LigaFilterParams, "page" | "limit">) {
  return useInfiniteQuery({
    queryKey: ["ligas-infinitas", filters],
    queryFn: ({ pageParam }) => leagueApi.listPaginated({ ...filters, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.rows.length === LIMIT ? lastPage.page + 1 : undefined,
  })
}
