import { api } from "@/infrastructure/api/client"
import type { RefereeBatchDetail, RefereeBatchSummary, RefereeCandidateDivision } from "./types"

interface ApiResponse<T> { success: boolean; data: T }
export interface RefereeCandidatePage { rows: RefereeCandidateDivision[]; total: number; page: number; limit: number }
const root = (leagueId: string) => `/api/ligas/${leagueId}/tandas-arbitrales`

export const refereeApi = {
  list: (leagueId: string) => api.get<ApiResponse<RefereeBatchSummary[]>>(root(leagueId)).then((r) => r.data.data),
  detail: (leagueId: string, batchId: string) => api.get<ApiResponse<RefereeBatchDetail>>(`${root(leagueId)}/${batchId}`).then((r) => r.data.data),
  candidates: (leagueId: string, page: number, limit = 10) => api.get<ApiResponse<RefereeCandidatePage>>(`/api/ligas/${leagueId}/candidatos-arbitraje?page=${page}&limit=${limit}`).then((r) => r.data.data),
  saveLeagueAssignments: (leagueId: string, body: { asignacionId?: string; divisionIds: string[]; asignaciones: { partidoId: string; arbitroIds: string[] }[] }) => api.put<ApiResponse<{ asignacionId: string; partidosAsignados: number; asignacionesCreadas: number }>>(`/api/ligas/${leagueId}/asignaciones-arbitros`, body).then((r) => r.data.data),
  removeAssignment: (leagueId: string, assignmentId: string) => api.delete(`/api/ligas/${leagueId}/asignaciones-arbitros/${assignmentId}`).then(() => undefined),
}
