import { useQueries } from "@tanstack/react-query"
import { divisionApi } from "@/features/division/api/divisions"
import { useUserLeagues } from "@/features/league/hooks/useLeagues"

export interface BillingDivisionOption {
  id: string
  nombre: string
  ligaId: string
  ligaNombre: string
}

export function useBillingDivisions(userId: string | null | undefined, enabled = true) {
  const leaguesQuery = useUserLeagues(enabled && userId ? userId : "")
  const divisionQueries = useQueries({
    queries: (leaguesQuery.data ?? []).map((league) => ({
      queryKey: ["divisions", league.id],
      queryFn: () => divisionApi.listByLiga(league.id),
      enabled,
      staleTime: 60_000,
    })),
  })
  const divisions = divisionQueries.flatMap((query, index) => {
    const league = leaguesQuery.data?.[index]
    if (!league) return []
    return (query.data ?? []).map((division) => ({
      id: division.id,
      nombre: division.nombre,
      ligaId: league.id,
      ligaNombre: league.nombre,
    }))
  })

  return {
    data: divisions,
    isPending: leaguesQuery.isPending || divisionQueries.some((query) => query.isPending),
    isError: leaguesQuery.isError || divisionQueries.some((query) => query.isError),
    refetch: async () => {
      await leaguesQuery.refetch()
      await Promise.all(divisionQueries.map((query) => query.refetch()))
    },
  }
}
