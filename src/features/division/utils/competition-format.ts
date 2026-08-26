import type { TipoCompetenciaRef } from "@/domain/interfaces/league"

/**
 * Formatos que la app sabe manejar. Vienen del `codigo` del catálogo, **nunca** del nombre:
 * el nombre se puede editar por API, y antes bastaba renombrar el tipo para apagar la pestaña
 * de eliminatorias sin que nadie se enterara.
 */
export type CompetitionFormat = "LIGA_Y_ELIMINATORIAS" | "ELIMINATORIA"

export type DivisionTab = "equipos" | "programacion" | "jornadas" | "posiciones" | "goleo" | "eliminatorias"

export interface FormatCapabilities {
  /** Jornadas regulares, tabla de posiciones, equipo que descansa y partidos de complemento. */
  faseLiga: boolean
  eliminatorias: boolean
  tabs: readonly DivisionTab[]
  /** Cómo se arma el cruce por defecto al generar el cuadro. */
  siembraPorDefecto: "POSICIONES" | "ALEATORIA"
}

const CAPABILITIES: Record<CompetitionFormat, FormatCapabilities> = {
  LIGA_Y_ELIMINATORIAS: {
    faseLiga: true,
    eliminatorias: true,
    tabs: ["equipos", "programacion", "jornadas", "posiciones", "goleo", "eliminatorias"],
    siembraPorDefecto: "POSICIONES",
  },
  ELIMINATORIA: {
    faseLiga: false,
    eliminatorias: true,
    // Sin fase de liga no hay puntos que mostrar, y las jornadas quedan como mecanismo interno
    // para fechar los partidos del cuadro.
    tabs: ["equipos", "programacion", "eliminatorias", "goleo"],
    siembraPorDefecto: "ALEATORIA",
  },
}

/**
 * Un código desconocido —o ausente, mientras el catálogo carga— cae al formato completo.
 * Ante la duda se muestra de más: esconder pestañas ocultaría datos que sí existen.
 */
export function formatFromCodigo(codigo?: string | null): CompetitionFormat {
  return codigo === "ELIMINATORIA" ? "ELIMINATORIA" : "LIGA_Y_ELIMINATORIAS"
}

export function capabilitiesFor(format: CompetitionFormat): FormatCapabilities {
  return CAPABILITIES[format]
}

/** Atajo para la pantalla: del catálogo y el id de la división a las capacidades. */
export function capabilitiesForDivision(
  tiposCompetencia: TipoCompetenciaRef[],
  tipoCompetenciaId?: string | null,
): FormatCapabilities {
  const tipo = tiposCompetencia.find((item) => item.id === tipoCompetenciaId)
  return capabilitiesFor(formatFromCodigo(tipo?.codigo))
}

/**
 * "El cuadro existe" se mide por **partidos**, no por rondas: una ronda puede quedar creada y vacía,
 * y eso no es un cuadro que valga la pena mostrar.
 *
 * Es la única definición, y la comparten la pantalla administrativa y la pública. Antes cada una
 * decidía por su cuenta —una siempre mostraba la pestaña y la otra miraba `rondas.length`— y por eso
 * divergieron.
 */
export function hayPartidosDeEliminatoria(rondas: readonly { partidos: readonly unknown[] }[]): boolean {
  return rondas.some((ronda) => ronda.partidos.length > 0)
}

/**
 * Las pestañas que la división muestra de verdad. `capabilities.tabs` es lo que permite el
 * **formato**; encima de eso, el goleo se apaga por división desde el menú de opciones y la
 * eliminatoria solo se muestra si hay partidos.
 *
 * Esconder la eliminatoria no deja inalcanzable nada: "Generar eliminatorias" vive en el menú de
 * opciones, no solo en el estado vacío de la pestaña.
 *
 * Recibe el arreglo y no el objeto de capacidades a propósito: pasarle `capabilities` entero hacía
 * que el compilador de React asumiera que esta función podía mutarlo y se rindiera con la
 * memoización de toda la pantalla.
 */
export function divisionTabs(
  tabs: readonly DivisionTab[],
  registrarGoleo: boolean,
  hayCuadro: boolean,
): DivisionTab[] {
  return tabs.filter((tab) => {
    if (tab === "goleo") return registrarGoleo
    if (tab === "eliminatorias") return hayCuadro
    return true
  })
}

export type PublicDivisionTab = "info" | "posiciones" | "eliminatoria" | "horario" | "goleo"

/**
 * Pestañas del detalle público de una división.
 *
 *  - **Posiciones** solo con fase de liga: en un cuadro puro la tabla no se llena nunca, porque
 *    `tablaPosicion.recalcular` excluye los partidos de eliminatoria.
 *  - **Eliminatoria** solo cuando hay partidos de eliminatoria. `hayCuadro` se mide con
 *    `hayPartidosDeEliminatoria`, no con la cantidad de rondas: una ronda vacía no es un cuadro.
 *  - **Goleo** solo si la división lo tiene encendido. `registrarGoleo` es opcional para que una
 *    respuesta vieja sin el campo no apague la pestaña.
 */
export function publicDivisionTabs(faseLiga: boolean, hayCuadro: boolean, registrarGoleo = true): PublicDivisionTab[] {
  return [
    "info",
    ...(faseLiga ? ["posiciones" as const] : []),
    ...(hayCuadro ? ["eliminatoria" as const] : []),
    "horario",
    ...(registrarGoleo ? ["goleo" as const] : []),
  ]
}
