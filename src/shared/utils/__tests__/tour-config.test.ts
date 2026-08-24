import { beforeEach, describe, expect, it, vi } from "vitest"
import { TOURS_QUE_SE_REPITEN, tourConfig, tourYaCompletado } from "../tour-config"

const mocks = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }))

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mocks.getItem, setItem: mocks.setItem },
}))
vi.mock("@/constants/theme", () => ({
  Palette: { surface: "surface", text: "text", textSecondary: "secondary", black: "black", cyan: "cyan", textMuted: "muted" },
  Radius: { lg: 12 },
}))

const insets = { top: 39, bottom: 24 }

describe("tourConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Android es edge-to-edge desde Expo 57 / RN 0.86, así que `measureInWindow` ya devuelve
   * coordenadas de pantalla completa. La librería asume lo contrario y le suma `insets.top`
   * a cada medición, lo que dejaba el spotlight una barra de estado más abajo del elemento.
   *
   * Ese offset se calcula **solo** con `insets`; el recorte del tooltip usa la suma
   * `insets + extraInsets`. Por eso el área segura real viaja en el segundo.
   *
   * Devolver el valor a `insets` reintroduce el desplazamiento en las diez pantallas, y no
   * lo atrapa ni `tsc` ni el lint: las dos formas compilan.
   */
  it("manda el área segura como extraInsets, no como insets", () => {
    const config = tourConfig({ tourId: "t", insets })

    expect(config.insets).toEqual({ top: 0, bottom: 0 })
    expect(config.extraInsets).toEqual({ top: 39, bottom: 24 })
  })

  it("no fija izquierda ni derecha, para que las resuelva la librería", () => {
    const config = tourConfig({ tourId: "t", insets })

    expect(config.insets).not.toHaveProperty("left")
    expect(config.extraInsets).not.toHaveProperty("left")
  })

  /** Varias pantallas pasan solo el offset; agruparlos en un spread condicional lo perdía. */
  it("reenvía getCurrentScrollOffset aunque no venga scrollRef", () => {
    const getCurrentScrollOffset = () => 120
    const config = tourConfig({ tourId: "t", insets, getCurrentScrollOffset })

    expect(config.getCurrentScrollOffset).toBe(getCurrentScrollOffset)
    expect(config).not.toHaveProperty("scrollRef")
  })

  it("persiste el tour al terminarlo y avisa a la pantalla", () => {
    const onTourEnd = vi.fn()
    tourConfig({ tourId: "mi-tour", insets, onTourEnd }).onTourEnd?.(true)

    expect(mocks.setItem).toHaveBeenCalledWith("@tour_guide:mi-tour", "completed")
    expect(onTourEnd).toHaveBeenCalledOnce()
  })
})

describe("tourYaCompletado", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("es true solo si quedó guardado como completado", async () => {
    mocks.getItem.mockResolvedValueOnce("completed")
    await expect(tourYaCompletado("otro-tour")).resolves.toBe(true)

    mocks.getItem.mockResolvedValueOnce(null)
    await expect(tourYaCompletado("otro-tour")).resolves.toBe(false)
  })

  /**
   * El andamio de depuración se publica **apagado**. Dejarlo encendido haría que un tutorial
   * saliera en cada apertura para todos los usuarios, y es un olvido silencioso: la app
   * compila y funciona igual.
   */
  it("no se publica con tours repetibles activos", () => {
    expect(TOURS_QUE_SE_REPITEN).toEqual([])
  })

  /**
   * El interruptor de depuración: un tour listado vuelve a salir en cada apertura, sin tener
   * que reinstalar la app. Como se publica vacío, el test agrega su propio id de mentira y lo
   * quita al terminar, en vez de nombrar un tour real.
   */
  it("ignora lo guardado para los tours marcados como repetibles", async () => {
    TOURS_QUE_SE_REPITEN.push("tour-repetible")
    try {
      mocks.getItem.mockResolvedValue("completed")
      await expect(tourYaCompletado("tour-repetible")).resolves.toBe(false)
      expect(mocks.getItem).not.toHaveBeenCalled()
    } finally {
      TOURS_QUE_SE_REPITEN.pop()
    }
  })
})
