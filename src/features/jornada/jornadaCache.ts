import type { InfiniteData } from "@tanstack/react-query"
import type { JornadaPage, JornadaResponse, PartidoResponse } from "./api/jornadas"

export const JORNADA_PAGE_SIZE = 4

function sortPartidos(partidos: PartidoResponse[]): PartidoResponse[] {
  return [...partidos].sort((a, b) => {
    const aTime = a.fecha ? Date.parse(a.fecha) : Number.POSITIVE_INFINITY
    const bTime = b.fecha ? Date.parse(b.fecha) : Number.POSITIVE_INFINITY
    return aTime - bTime || a.id.localeCompare(b.id)
  })
}

export function upsertPartidoInJornada(jornada: JornadaResponse, partido: PartidoResponse): JornadaResponse {
  if (jornada.id !== partido.jornadaId || !jornada.partidos) return jornada
  const partidos = jornada.partidos.some((current) => current.id === partido.id)
    ? jornada.partidos.map((current) => current.id === partido.id ? { ...current, ...partido } : current)
    : [...jornada.partidos, partido]
  return { ...jornada, partidos: sortPartidos(partidos) }
}

export function patchPartidoInJornadas(current: JornadaResponse[] | undefined, partido: PartidoResponse): JornadaResponse[] | undefined {
  return current?.map((jornada) => upsertPartidoInJornada(jornada, partido))
}

export function patchPartidoInInfinite(current: InfiniteData<JornadaPage> | undefined, partido: PartidoResponse): InfiniteData<JornadaPage> | undefined {
  if (!current) return current
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      rows: page.rows.map((jornada) => upsertPartidoInJornada(jornada, partido)),
    })),
  }
}

export function insertGeneratedJornada(current: JornadaResponse[] | undefined, jornada: JornadaResponse): JornadaResponse[] | undefined {
  if (!current) return current
  return [jornada, ...current.filter((entry) => entry.id !== jornada.id)]
    .sort((a, b) => b.numero - a.numero || a.id.localeCompare(b.id))
    .slice(0, 10)
}

export function insertGeneratedJornadaInInfinite(current: InfiniteData<JornadaPage> | undefined, jornada: JornadaResponse): InfiniteData<JornadaPage> | undefined {
  if (!current?.pages.length) return current
  const limit = current.pages[0].limit
  if (limit <= 0 || current.pages.some((page, index) => page.limit !== limit || page.page !== index + 1)) return current
  const flattened = current.pages.flatMap((page) => page.rows)
  const existed = flattened.some((entry) => entry.id === jornada.id)
  const rows = [jornada, ...flattened.filter((entry) => entry.id !== jornada.id)]
    .sort((a, b) => b.numero - a.numero || a.id.localeCompare(b.id))
    .slice(0, current.pages.length * limit)
  const total = Math.max(0, current.pages[0].total + (existed ? 0 : 1))
  return {
    ...current,
    pages: current.pages.map((page, index) => ({ ...page, total, rows: rows.slice(index * limit, (index + 1) * limit) })),
  }
}

export function removeJornadaFromInfinite(current: InfiniteData<JornadaPage> | undefined, jornadaId: string): InfiniteData<JornadaPage> | null | undefined {
  if (!current?.pages.length) return current
  const flattened = current.pages.flatMap((page) => page.rows)
  const total = current.pages[0].total
  if (flattened.length < total) return null
  const rows = flattened.filter((jornada) => jornada.id !== jornadaId)
  if (rows.length === flattened.length) return current
  const limit = current.pages[0].limit
  const pageCount = Math.max(1, Math.ceil(rows.length / limit))
  const nextTotal = Math.max(0, total - 1)
  const pages = current.pages.slice(0, pageCount).map((page, index) => ({
    ...page,
    page: index + 1,
    total: nextTotal,
    rows: rows.slice(index * limit, (index + 1) * limit),
  }))
  return { pages, pageParams: current.pageParams.slice(0, pageCount) }
}

export function emptyJornadasInfinite(): InfiniteData<JornadaPage> {
  return { pages: [{ rows: [], total: 0, page: 1, limit: JORNADA_PAGE_SIZE }], pageParams: [1] }
}
