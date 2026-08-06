import { useQuery } from "@tanstack/react-query"
import { goleadoresApi } from "../api/goleadores"

export function useGoleadores(divisionId?: string | null) {
  return useQuery({
    queryKey: ["goleadores", divisionId],
    queryFn: () => goleadoresApi.listByDivision(divisionId!),
    enabled: !!divisionId,
  })
}
