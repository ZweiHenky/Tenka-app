import { api } from "@/infrastructure/api/client"

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

export const lookupsApi = {
  categorias: () => api.get<ApiRes<Item[]>>("/api/categorias").then((r) => r.data.data!),
  tipos: () => api.get<ApiRes<Item[]>>("/api/tipos").then((r) => r.data.data!),
  ubicaciones: () => api.get<ApiRes<UbicacionItem[]>>("/api/ubicaciones").then((r) => r.data.data!),
  estadosLiga: () => api.get<ApiRes<Item[]>>("/api/estados-liga").then((r) => r.data.data!),
  tiposCompetencia: () => api.get<ApiRes<Item[]>>("/api/tipos-competencia").then((r) => r.data.data!),
}
