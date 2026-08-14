import { useQuery } from "@tanstack/react-query"
import { tablaPosicionApi } from "../api/tablaPosicion"

export function useTablaPosiciones(divisionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["tabla-posiciones", divisionId],
    queryFn: () => tablaPosicionApi.listByDivision(divisionId!),
    enabled: enabled && !!divisionId,
  })
}
