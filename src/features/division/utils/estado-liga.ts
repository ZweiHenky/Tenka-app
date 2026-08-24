import type { EstadoLigaRef } from "@/domain/interfaces/league"

/**
 * El estado de una división se decide por `codigo`, nunca por `nombre`.
 *
 * El catálogo es editable por API: comparar el nombre hacía que renombrar la fila "Borrador"
 * publicara todos los borradores de golpe y dejara sin efecto Publicar y Regresar a borrador.
 * El nombre sigue siendo lo que se muestra; es solo la etiqueta.
 */
export type CodigoEstadoLiga = "BORRADOR" | "ABIERTA" | "EN_CURSO" | "FINALIZADA" | "CANCELADA"

/** El id de la fila del catálogo con ese código, para mandarlo en el update. */
export function estadoIdPorCodigo(estados: readonly EstadoLigaRef[], codigo: CodigoEstadoLiga): string | undefined {
  return estados.find((estado) => estado.codigo === codigo)?.id
}

/** El código de la fila que la división tiene asignada. */
export function codigoDeEstado(estados: readonly EstadoLigaRef[], estadoLigaId?: string | null): string | undefined {
  if (!estadoLigaId) return undefined
  return estados.find((estado) => estado.id === estadoLigaId)?.codigo
}

/** Los estados congelados no aceptan escrituras; el servidor responde 422. */
export function esSoloLectura(codigo?: string): boolean {
  return codigo === "FINALIZADA" || codigo === "CANCELADA"
}
