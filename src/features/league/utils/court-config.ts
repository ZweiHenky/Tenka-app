import type { LeagueCourtInput, LigaCanchaRef } from "@/domain/interfaces/league"

export interface CourtDraft {
  key: string
  id?: string
  nombre: string
  activa: boolean
}

export function createCourtDrafts(courts: LigaCanchaRef[] = []): CourtDraft[] {
  return courts.map((court) => ({
    key: court.id,
    id: court.id,
    nombre: court.nombre,
    activa: court.activa,
  }))
}

export function validateCourtConfig(enabled: boolean, courts: CourtDraft[]): string | null {
  const names = courts.map((court) => court.nombre.trim()).filter(Boolean)
  const normalizedNames = names.map((name) => name.toLocaleLowerCase("es"))

  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return "Los nombres de las canchas no pueden repetirse"
  }

  if (!enabled) return null

  const activeCourts = courts.filter((court) => court.activa)
  const namedActiveCourts = activeCourts.filter((court) => court.nombre.trim())
  if (namedActiveCourts.length < 2) return "Agrega al menos 2 canchas activas con nombre"
  if (namedActiveCourts.length !== activeCourts.length) return "Todas las canchas activas deben tener nombre"

  return null
}

export function toCourtPayload(courts: CourtDraft[]): LeagueCourtInput[] {
  return courts.flatMap((court) => {
    const nombre = court.nombre.trim()
    if (!court.id && !nombre) return []

    return [{
      ...(court.id ? { id: court.id } : {}),
      ...(nombre ? { nombre } : {}),
      activa: court.activa,
    }]
  })
}
