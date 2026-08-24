import { api } from "@/infrastructure/api/client"
import type { EstadoLigaRef, TipoCompetenciaRef } from "@/domain/interfaces/league"

interface ApiRes<T> {
  success: boolean
  data?: T
}

interface Item {
  id: string
  nombre: string
}

interface UbicacionItem {
  id: string
  nombreCompleto: string
  estado: string
  municipio: string
}

interface PaginatedResponse<T> {
  rows: T[]
  total: number
}

async function getUbicaciones(): Promise<UbicacionItem[]> {
  const rows: UbicacionItem[] = []
  let page = 1
  while (true) {
    const response = await api.get<ApiRes<PaginatedResponse<UbicacionItem>>>(`/api/ubicaciones?page=${page}&limit=100`)
    const result = response.data.data!
    rows.push(...result.rows)
    if (rows.length >= result.total || result.rows.length === 0) return rows
    page += 1
  }
}

export const lookupsApi = {
  categorias: () => api.get<ApiRes<Item[]>>("/api/categorias").then((r) => r.data.data!),
  tipos: () => api.get<ApiRes<Item[]>>("/api/tipos").then((r) => r.data.data!),
  ubicaciones: getUbicaciones,
  // Igual que tiposCompetencia: trae `codigo`, y es con eso que la app decide si una división
  // es borrador o está en curso. El nombre solo se muestra.
  estadosLiga: () => api.get<ApiRes<EstadoLigaRef[]>>("/api/estados-liga").then((r) => r.data.data!),
  // Tipado aparte de `Item`: este endpoint además trae `codigo`, que es con lo que la app
  // decide el formato de la división (ver features/division/utils/competition-format.ts).
  tiposCompetencia: () => api.get<ApiRes<TipoCompetenciaRef[]>>("/api/tipos-competencia").then((r) => r.data.data!),
}
