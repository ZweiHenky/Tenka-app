import { useInfiniteQuery } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"

const LIMIT = 4

export function useJornadasInfinitas(divisionId: string | null) {
  return useInfiniteQuery({
    queryKey: ["jornadas-infinitas", divisionId],
    queryFn: ({ pageParam }) => jornadaApi.listByDivisionPaginated(divisionId!, pageParam, LIMIT),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.rows.length === 0) return undefined
      return lastPage.page * LIMIT < lastPage.total ? lastPage.page + 1 : undefined
    },
    enabled: !!divisionId,
  })
}
