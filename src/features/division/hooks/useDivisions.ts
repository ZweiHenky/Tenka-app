import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { divisionApi } from "@/features/division/api/divisions"
import type { CreateDivisionInput, Division } from "@/domain/interfaces/league"

export function useDivisions(ligaId: string) {
  return useQuery({
    queryKey: ["divisions", ligaId],
    queryFn: () => divisionApi.listByLiga(ligaId),
    enabled: !!ligaId,
  })
}

export function useDivision(divisionId: string) {
  return useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId),
    enabled: !!divisionId,
  })
}

export function useCreateDivision(ligaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDivisionInput) => divisionApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["divisions", ligaId] })
      qc.invalidateQueries({ queryKey: ["leagues", ligaId] })
    },
  })
}

export function useUpdateDivision(ligaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDivisionInput> }) =>
      divisionApi.update(id, data),
    onSuccess: (result, { id }) => {
      qc.setQueryData<Division>(["division", id], result)
      qc.invalidateQueries({ queryKey: ["divisions", ligaId] })
      qc.invalidateQueries({ queryKey: ["leagues", ligaId] })
    },
  })
}

export function useDeleteDivision(ligaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => divisionApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["divisions", ligaId] })
      qc.invalidateQueries({ queryKey: ["leagues", ligaId] })
    },
  })
}

export function useResetDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (divisionId: string) => divisionApi.reset(divisionId),
    onSuccess: (_, divisionId) => {
      qc.invalidateQueries({ queryKey: ["jornadas", divisionId] })
      qc.invalidateQueries({ queryKey: ["jornadas-infinitas", divisionId] })
      qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] })
      qc.invalidateQueries({ queryKey: ["tabla-posiciones", divisionId] })
      qc.invalidateQueries({ queryKey: ["goleadores", divisionId] })
      qc.invalidateQueries({ queryKey: ["last-jornada", divisionId] })
      qc.invalidateQueries({ queryKey: ["partido"] })
    },
  })
}
