import { api } from "@/infrastructure/api/client"

export type CourtMode = "SINGLE" | "MULTIPLE"

export interface AvailableCourt {
  id: string
  nombre: string
}

export interface CourtOccupancy {
  id: string
  fecha: string
  fechaFin: string
  canchaId: string | null
  division: { id: string; nombre: string }
}

export interface CourtAvailability {
  ligaId: string
  mode: CourtMode
  inicio: string
  fin: string
  canchas: AvailableCourt[]
  ocupaciones: CourtOccupancy[]
  asignaciones: Record<string, CourtOccupancy[]>
  partidosSinCancha: CourtOccupancy[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export const courtAvailabilityApi = {
  get: (ligaId: string, inicio: string, fin: string) =>
    api.get<ApiResponse<CourtAvailability>>(
      `/api/ligas/${ligaId}/disponibilidad-canchas`,
      { params: { inicio, fin } },
    ).then((response) => response.data.data),
}
