import { useQuery } from "@tanstack/react-query"
import { courtAvailabilityApi } from "../api/courtAvailability"

export const courtAvailabilityKey = (ligaId: string, inicio: string, fin: string) =>
  ["court-availability", ligaId, inicio, fin] as const

export function useCourtAvailability(ligaId?: string, inicio?: string, fin?: string) {
  return useQuery({
    queryKey: courtAvailabilityKey(ligaId ?? "", inicio ?? "", fin ?? ""),
    queryFn: () => courtAvailabilityApi.get(ligaId!, inicio!, fin!),
    enabled: !!ligaId && !!inicio && !!fin,
    staleTime: 30_000,
  })
}
