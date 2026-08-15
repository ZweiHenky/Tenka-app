import { useInfiniteQuery } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"
import { JORNADA_PAGE_SIZE } from "@/features/jornada/jornadaCache"

export function useJornadasInfinitas(divisionId: string | null, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["jornadas-infinitas", divisionId],
    queryFn: ({ pageParam }) => jornadaApi.listByDivisionPaginated(divisionId!, pageParam, JORNADA_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.rows.length === 0) return undefined
      return lastPage.page * JORNADA_PAGE_SIZE < lastPage.total ? lastPage.page + 1 : undefined
    },
    enabled: enabled && !!divisionId,
  })
}
