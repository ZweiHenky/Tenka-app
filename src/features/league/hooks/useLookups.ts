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

export interface LookupSelection {
  categorias?: boolean
  tipos?: boolean
  ubicaciones?: boolean
  estadosLiga?: boolean
  tiposCompetencia?: boolean
}

export function useLookups(selection: LookupSelection): Lookups {
  const enabled = [
    selection.categorias === true,
    selection.tipos === true,
    selection.ubicaciones === true,
    selection.estadosLiga === true,
    selection.tiposCompetencia === true,
  ]
  const results = useQueries({
    queries: [
      { queryKey: ["categorias"], queryFn: lookupsApi.categorias, staleTime: 1000 * 60 * 5, enabled: enabled[0] },
      { queryKey: ["tipos"], queryFn: lookupsApi.tipos, staleTime: 1000 * 60 * 5, enabled: enabled[1] },
      { queryKey: ["ubicaciones"], queryFn: lookupsApi.ubicaciones, staleTime: 1000 * 60 * 5, enabled: enabled[2] },
      { queryKey: ["estadosLiga"], queryFn: lookupsApi.estadosLiga, staleTime: 1000 * 60 * 5, enabled: enabled[3] },
      { queryKey: ["tiposCompetencia"], queryFn: lookupsApi.tiposCompetencia, staleTime: 1000 * 60 * 5, enabled: enabled[4] },
    ],
  })

  return {
    categorias: results[0].data ?? [],
    tipos: results[1].data ?? [],
    ubicaciones: results[2].data ?? [],
    estadosLiga: results[3].data ?? [],
    tiposCompetencia: results[4].data ?? [],
    isLoading: results.some((result, index) => enabled[index] && result.isLoading),
  }
}
