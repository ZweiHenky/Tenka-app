interface PartidoScheduling {
  tipoPartido?: string | null
  fecha?: string | null
  fechaFin?: string | null
  canchaId?: string | null
}

export function getPlayoffFinalizationError(partido: PartidoScheduling, multiplesCanchas: boolean): string | null {
  if (partido.tipoPartido !== "ELIMINATORIA") return null

  const inicio = partido.fecha ? Date.parse(partido.fecha) : NaN
  const fin = partido.fechaFin ? Date.parse(partido.fechaFin) : NaN
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) {
    return "Para asignar resultados, primero genera la jornada."
  }

  if (multiplesCanchas && !partido.canchaId) {
    return "Para finalizar una eliminatoria en esta liga, primero asigna una cancha."
  }

  return null
}
