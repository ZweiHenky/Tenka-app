// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTour } from "../useTour"

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  startTour: vi.fn(),
  endTour: vi.fn(),
  tourGuide: { isActive: false, activeTourId: undefined as string | undefined },
}))

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mocks.getItem, setItem: mocks.setItem },
}))
vi.mock("@wrack/react-native-tour-guide", () => ({
  useTourGuide: () => ({
    startTour: mocks.startTour,
    endTour: mocks.endTour,
    isActive: mocks.tourGuide.isActive,
    activeTourId: mocks.tourGuide.activeTourId,
  }),
}))
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 10, bottom: 20, left: 0, right: 0 }),
}))
vi.mock("@/constants/theme", () => ({
  Palette: { surface: "surface", text: "text", textSecondary: "secondary", black: "black", cyan: "cyan", textMuted: "muted" },
  Radius: { lg: 12 },
}))

const baseOptions = {
  tourId: "test-tour",
  isFocused: true,
  isBlocked: false,
  isEnabled: true,
  allRefsReady: true,
  steps: [{ id: "step", targetRef: { current: null }, title: "Paso", description: "Descripción" }],
}

describe("useTour", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.tourGuide.isActive = false
    mocks.tourGuide.activeTourId = undefined
    mocks.getItem.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts an eligible unseen tour after the delay", async () => {
    renderHook(() => useTour(baseOptions))

    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(600) })

    expect(mocks.startTour).toHaveBeenCalledOnce()
    expect(mocks.startTour.mock.calls[0][1]).toMatchObject({
      tourId: "test-tour",
    })
  })

  /**
   * Android es edge-to-edge: `measureInWindow` ya devuelve coordenadas de pantalla
   * completa. La librería asume lo contrario y le suma `insets.top` a cada medición, lo
   * que dejaba el spotlight una barra de estado más abajo que el elemento. El offset se
   * calcula solo con `insets` y el recorte del tooltip con `insets + extraInsets`, así
   * que el área segura real viaja en el segundo.
   *
   * Devolver el valor a `insets` reintroduce el desplazamiento, y no lo atrapa ni `tsc`
   * ni el lint: ambas formas compilan.
   */
  it("manda el área segura como extraInsets, no como insets", async () => {
    renderHook(() => useTour(baseOptions))

    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(600) })

    expect(mocks.startTour.mock.calls[0][1]).toMatchObject({
      insets: { top: 0, bottom: 0 },
      extraInsets: { top: 10, bottom: 20 },
    })
  })

  it("does not start while another tour is active", async () => {
    mocks.tourGuide.isActive = true
    mocks.tourGuide.activeTourId = "other-tour"

    renderHook(() => useTour(baseOptions))
    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(600) })

    expect(mocks.getItem).not.toHaveBeenCalled()
    expect(mocks.startTour).not.toHaveBeenCalled()
  })

  it("does not start a completed tour", async () => {
    mocks.getItem.mockResolvedValue("completed")

    renderHook(() => useTour(baseOptions))
    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(600) })

    expect(mocks.startTour).not.toHaveBeenCalled()
  })

  it("ends its active tour when the screen becomes blocked", () => {
    const onTourEnd = vi.fn()
    mocks.tourGuide.isActive = true
    mocks.tourGuide.activeTourId = "test-tour"

    renderHook(() => useTour({ ...baseOptions, isBlocked: true, onTourEnd }))

    expect(mocks.endTour).toHaveBeenCalledOnce()
    expect(onTourEnd).toHaveBeenCalledOnce()
  })

  it("persists completion when the tour callback runs", async () => {
    const onTourEnd = vi.fn()
    renderHook(() => useTour({ ...baseOptions, onTourEnd }))
    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(600) })

    const config = mocks.startTour.mock.calls[0][1]
    act(() => { config.onTourEnd() })

    expect(mocks.setItem).toHaveBeenCalledWith("@tour_guide:test-tour", "completed")
    expect(onTourEnd).toHaveBeenCalledOnce()
  })
})
