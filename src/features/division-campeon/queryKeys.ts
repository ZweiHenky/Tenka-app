/**
 * Sin imports a propósito: la clave la usan `useDeleteRondasByDivision` y `useResetDivision`, y
 * traerla desde el archivo de hooks les metía el cliente HTTP —y con él expo— en la cadena de
 * imports, rompiendo sus tests de caché, que corren en jsdom.
 */
export const divisionCampeonKey = (divisionId: string) => ["division-campeon", divisionId] as const

/** Los títulos anteriores de una división. */
export const historialCampeonesKey = (divisionId: string) => ["campeones-historial", divisionId] as const

/** El palmarés de goleo de un jugador. */
export const campeonatosJugadorKey = (jugadorId: string) => ["campeonatos-jugador", jugadorId] as const

/** El palmarés de un equipo: las divisiones que ganó. */
export const campeonatosEquipoKey = (equipoId: string) => ["campeonatos-equipo", equipoId] as const
