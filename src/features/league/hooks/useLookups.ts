import { useQueries } from "@tanstack/react-query"
import { lookupsApi } from "@/features/league/api/lookups"
import type { CategoriaRef, TipoRef, EstadoLigaRef, TipoCompetenciaRef } from "@/domain/interfaces/league"

export interface Lookups {
  categorias: CategoriaRef[]
  tipos: TipoRef[]
  ubicaciones: { id: string; nombreCompleto: string; estado: string; municipio: string }[]
  estadosLiga: EstadoLigaRef[]
  tiposCompetencia: TipoCompetenciaRef[]
  isLoading: boolean
}

export function useLookups(): Lookups {
  const results = useQueries({
    queries: [
      { queryKey: ["categorias"], queryFn: lookupsApi.categorias, staleTime: 1000 * 60 * 5 },
      { queryKey: ["tipos"], queryFn: lookupsApi.tipos, staleTime: 1000 * 60 * 5 },
      { queryKey: ["ubicaciones"], queryFn: lookupsApi.ubicaciones, staleTime: 1000 * 60 * 5 },
      { queryKey: ["estadosLiga"], queryFn: lookupsApi.estadosLiga, staleTime: 1000 * 60 * 5 },
      { queryKey: ["tiposCompetencia"], queryFn: lookupsApi.tiposCompetencia, staleTime: 1000 * 60 * 5 },
    ],
  })

  return {
    categorias: results[0].data ?? [],
    tipos: results[1].data ?? [],
    ubicaciones: results[2].data ?? [],
    estadosLiga: results[3].data ?? [],
    tiposCompetencia: results[4].data ?? [],
    isLoading: results.some((r) => r.isLoading),
  }
}
