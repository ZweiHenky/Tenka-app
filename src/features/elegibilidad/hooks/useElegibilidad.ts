import { useQuery } from "@tanstack/react-query"
import { elegibilidadApi } from "../api/elegibilidad"

export function useElegibilidad(divisionId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["elegibilidad", divisionId],
    queryFn: () => elegibilidadApi.listByDivision(divisionId!),
    enabled: enabled && !!divisionId,
  })
}
