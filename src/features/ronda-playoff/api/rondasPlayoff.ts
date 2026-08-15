import { api } from "@/infrastructure/api/client"
import type { PartidoResponse } from "@/features/partido/api/partidos"

interface ApiRes<T> {
  success: boolean
  data?: T
}

export interface RondaPlayoff {
  id: string
  nombre: string
  orden: number
  divisionId: string
  createdAt: string
  updatedAt: string
  partidos: PartidoResponse[]
}

const listByDivision = (divisionId: string) =>
  api.get<ApiRes<RondaPlayoff[]>>(`/api/rondas-playoff/division/${divisionId}`).then((response) => response.data.data!)

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function reconcileGeneratedRounds(divisionId: string, attempts: number): Promise<RondaPlayoff[]> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const rounds = await listByDivision(divisionId)
      if (rounds.length > 0) return rounds
    } catch (error) {
      lastError = error
    }
    if (attempt + 1 < attempts) await wait(400 * (attempt + 1))
  }
  if (lastError) throw lastError
  return []
}

export const rondaPlayoffApi = {
  listByDivision,
  create: (data: { nombre: string; orden: number; divisionId: string }) =>
    api.post<ApiRes<RondaPlayoff>>("/api/rondas-playoff", data).then((r) => r.data.data!),
  generate: async (data: { divisionId: string; cantidadEquipos: number }) => {
    let networkError: unknown
    try {
      await api.post<ApiRes<RondaPlayoff[]>>("/api/rondas-playoff/generate", data)
    } catch (error) {
      if ((error as { response?: unknown })?.response) throw error
      networkError = error
    }

    try {
      const rounds = await reconcileGeneratedRounds(data.divisionId, networkError ? 3 : 1)
      if (rounds.length > 0) return rounds
    } catch (reconciliationError) {
      throw networkError ?? reconciliationError
    }

    if (networkError) throw networkError
    throw new Error("Las eliminatorias se generaron, pero no se pudieron cargar")
  },
  deleteByDivision: (divisionId: string) =>
    api.delete<ApiRes<undefined>>(`/api/rondas-playoff/division/${divisionId}`).then((r) => r.data),
}
