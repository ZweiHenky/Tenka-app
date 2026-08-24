import type { QueryClient } from "@tanstack/react-query"

/**
 * Descarta de la caché una entrada cuyo registro ya no existe en el servidor.
 *
 * Si alguien la está observando se invalida —así el refetch trae el 404 y la pantalla puede
 * reaccionar—; si no, se elimina sin más, para no dejar basura ni disparar una petición que nadie
 * pidió.
 */
export function removeDeletedQuery(qc: QueryClient, queryKey: readonly unknown[]) {
  const query = qc.getQueryCache().find({ queryKey, exact: true })
  if (query?.isActive()) qc.invalidateQueries({ queryKey, exact: true })
  else qc.removeQueries({ queryKey, exact: true })
}
