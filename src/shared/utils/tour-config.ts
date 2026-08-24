import AsyncStorage from "@react-native-async-storage/async-storage"
import type { TourGuideConfig } from "@wrack/react-native-tour-guide"
import { Palette, Radius } from "@/constants/theme"

/**
 * Herramienta de depuración: los `tourId` listados aquí ignoran que ya se completaron y
 * vuelven a salir en cada apertura de la app. Sirve para revisar la posición de un tour sin
 * tener que reinstalar para borrar AsyncStorage.
 *
 * **Se usa vacía.** Agregá un id mientras depurás y quitalo al terminar; hay un test que
 * falla si el arreglo se commitea con algo dentro, porque el modo de fallo real no es que
 * esto exista sino olvidarlo encendido, y eso no lo atrapan ni `tsc` ni el lint.
 *
 * No va detrás de `__DEV__` a propósito: las pruebas también se hacen en APK de preview,
 * donde `__DEV__` es `false`.
 */
export const TOURS_QUE_SE_REPITEN: string[] = []

export const tourStorageKey = (tourId: string) => `@tour_guide:${tourId}`

/** Un tour se salta si ya se completó, salvo que esté marcado como repetible. */
export async function tourYaCompletado(tourId: string): Promise<boolean> {
  if (TOURS_QUE_SE_REPITEN.includes(tourId)) return false
  return (await AsyncStorage.getItem(tourStorageKey(tourId))) === "completed"
}

interface TourConfigOptions {
  tourId: string
  /** El área segura real de la pantalla, tal cual la devuelve `useSafeAreaInsets()`. */
  insets: { top: number; bottom: number }
  onTourEnd?: () => void
  scrollRef?: React.RefObject<any>
  getCurrentScrollOffset?: () => number
}

/**
 * La configuración de **todos** los tours de la app.
 *
 * Existe porque antes estaba copiada en línea en las diez pantallas —doce veces el mismo
 * objeto, idéntico salvo el `tourId`—, y esa duplicación dejó que un arreglo de posición se
 * aplicara en una sola copia sin que nada avisara. Ninguna pantalla debe volver a armar esto
 * a mano.
 */
export function tourConfig({
  tourId,
  insets,
  onTourEnd,
  scrollRef,
  getCurrentScrollOffset,
}: TourConfigOptions): TourGuideConfig {
  return {
    tourId,
    /**
     * Android es edge-to-edge desde el salto a Expo 57 / RN 0.86, así que `measureInWindow`
     * ya devuelve coordenadas de pantalla completa. La librería asume lo contrario —que el
     * contenido empieza debajo de la barra de estado— y le suma `insets.top` a cada medición
     * (`measureTopOffset` en su `TourGuideOverlay`), dejando el spotlight una barra de estado
     * **más abajo** que el elemento. Antes del salto esa suma era correcta.
     *
     * El offset se calcula **solo** con `insets`, mientras que el recorte que mantiene al
     * tooltip fuera del sistema usa la suma `insets + extraInsets`. Por eso el área segura
     * real se muda al segundo: apaga la corrección sobrante sin perder los márgenes. Y como
     * la librería resuelve con `config.insets.top ?? auto.top`, un `0` explícito gana donde
     * un campo ausente caería al valor automático.
     *
     * Izquierda y derecha se omiten para que las siga resolviendo sola.
     */
    insets: { top: 0, bottom: 0 },
    extraInsets: { top: insets.top, bottom: insets.bottom },
    nextButtonText: "Siguiente",
    prevButtonText: "Atrás",
    skipButtonText: "Saltar",
    doneButtonText: "Entendido",
    onTourEnd: () => {
      AsyncStorage.setItem(tourStorageKey(tourId), "completed")
      onTourEnd?.()
    },
    tooltipStyles: {
      backgroundColor: Palette.surface,
      titleColor: Palette.text,
      descriptionColor: Palette.textSecondary,
      buttonTextColor: Palette.black,
      primaryButtonColor: Palette.cyan,
      skipButtonColor: Palette.textMuted,
      borderRadius: Radius.lg,
    },
    spotlightStyles: {
      overlayColor: Palette.black,
      overlayOpacity: 0.7,
    },
    // Cada uno por separado: hay pantallas que pasan solo `getCurrentScrollOffset`, y
    // agruparlos en un spread condicional lo descartaba en silencio.
    ...(scrollRef ? { scrollRef } : {}),
    ...(getCurrentScrollOffset ? { getCurrentScrollOffset } : {}),
  }
}
