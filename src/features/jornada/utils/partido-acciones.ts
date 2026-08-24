import type { MaterialIcons } from "@expo/vector-icons"
import { Palette } from "@/constants/theme"

type IconName = keyof typeof MaterialIcons.glyphMap

export interface AccionSecundaria {
  label: string
  targetEstado: string
  icon: IconName
}

export interface AyudaDeAccion {
  icon: IconName
  title: string
  description: string
  color: string
  background: string
}

/**
 * La leyenda de la hoja "Acciones del partido". Tiene que cubrir **todos** los botones que el
 * editor puede mostrar: faltaba "Corregir resultado" desde que se agregó, así que la ayuda
 * explicaba cuatro de los cinco.
 *
 * Vive aquí y no dentro del componente para poder cubrirla con un test — el entorno de pruebas es
 * `node` y no puede importar nada que arrastre `react-native`.
 */
export const ACTION_HELP: AyudaDeAccion[] = [
  {
    icon: "check-circle",
    title: "Finalizar partido",
    description: "Guarda el resultado final y, cuando corresponde, actualiza la tabla de posiciones.",
    color: Palette.cyan,
    background: Palette.cyan10,
  },
  {
    icon: "pause-circle-outline",
    title: "Suspender",
    description: "Marca el partido como suspendido para que no cuente en la tabla.",
    color: Palette.danger,
    background: Palette.danger10,
  },
  {
    icon: "edit",
    title: "Corregir resultado",
    description:
      "Desbloquea un partido ya finalizado para ajustar el marcador, los penales, los goleadores o la alineación. No se pierde nada: el partido sigue finalizado y contando en la tabla, y los cambios se confirman con «Guardar corrección».",
    color: Palette.warning,
    background: Palette.warning10,
  },
  {
    icon: "replay",
    title: "Reabrir",
    description:
      "El partido no desaparece: sigue en su jornada con la misma fecha, hora, cancha y equipos. Lo que se borra es todo el resultado —marcador, penales, goleadores y alineación—, así que vuelve a quedar pendiente y deja de contar en la tabla. Es para capturarlo de nuevo desde cero; si solo quieres ajustar un dato, usa «Corregir resultado».",
    color: Palette.cyan,
    background: Palette.cyan10,
  },
  {
    icon: "flag",
    title: "Penales",
    description: "Aparecen en eliminatorias y cuando la división los usa para resolver empates.",
    color: Palette.warning,
    background: Palette.warning10,
  },
]

/** Los botones de cambio de estado que se ofrecen según cómo esté el partido. */
export function secondaryActions(estado: string | null): AccionSecundaria[] {
  if (estado === "FINALIZADO") {
    return [
      { label: "Suspender", targetEstado: "SUSPENDIDO", icon: "pause-circle-outline" },
      { label: "Reabrir", targetEstado: "PROGRAMADO", icon: "replay" },
    ]
  }
  if (estado === "SUSPENDIDO") return [{ label: "Reabrir", targetEstado: "PROGRAMADO", icon: "replay" }]
  if (estado === "EN_JUEGO") return [{ label: "Suspender", targetEstado: "SUSPENDIDO", icon: "pause-circle-outline" }]
  return []
}
