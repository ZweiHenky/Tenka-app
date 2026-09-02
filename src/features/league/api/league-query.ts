import type { LigaFilterParams } from "./leagues"

export function buildLeagueQuery(p: LigaFilterParams): string {
  const query = new URLSearchParams({ page: String(p.page), limit: String(p.limit) })
  if (p.search) query.set("search", p.search)
  if (p.categoriaId) query.set("categoriaId", p.categoriaId)
  if (p.tipoId) query.set("tipoId", p.tipoId)
  if (p.estadoLigaId) query.set("estadoLigaId", p.estadoLigaId)
  if (p.latitude !== undefined) query.set("latitude", String(p.latitude))
  if (p.longitude !== undefined) query.set("longitude", String(p.longitude))
  return query.toString()
}
