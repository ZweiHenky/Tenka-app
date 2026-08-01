// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDivisionScanner } from "../useDivisionScanner"

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("@/features/division-equipo/hooks/useDivisionEquipo", () => ({
  useAssignTeam: () => ({ mutate: mocks.mutate, isPending: false }),
}))
vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}))

describe("useDivisionScanner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reports an unknown QR and unlocks scanning on retry", () => {
    const { result } = renderHook(() => useDivisionScanner("division", [{ id: "team", nombre: "Equipo" }], []))

    act(() => { result.current.handleBarcodeScanned({ data: "unknown" } as never) })
    expect(result.current.scannerError).toBe("No se encontró ningún equipo con ese código")

    act(() => { result.current.handleBarcodeScanned({ data: "team" } as never) })
    expect(mocks.mutate).not.toHaveBeenCalled()

    act(() => { result.current.handleScannerRetry() })
    act(() => { result.current.handleBarcodeScanned({ data: "team" } as never) })
    expect(mocks.mutate).toHaveBeenCalledOnce()
  })

  it("reports when the scanned team is already assigned", () => {
    const { result } = renderHook(() => useDivisionScanner(
      "division",
      [{ id: "team", nombre: "Equipo" }],
      [{ equipoId: "team" }],
    ))

    act(() => { result.current.handleBarcodeScanned({ data: "team" } as never) })

    expect(result.current.scannerError).toBe('"Equipo" ya está en esta división')
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it("assigns a valid team, closes the scanner and forwards mutation feedback", () => {
    const { result } = renderHook(() => useDivisionScanner("division", [{ id: "team", nombre: "Equipo" }], []))
    act(() => { result.current.handleScannerOpen() })
    expect(result.current.scannerOpen).toBe(true)

    act(() => { result.current.handleBarcodeScanned({ data: " team " } as never) })

    expect(mocks.mutate).toHaveBeenCalledWith(
      { divisionId: "division", equipoId: "team" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
    expect(result.current.scannerOpen).toBe(false)

    const callbacks = mocks.mutate.mock.calls[0][1]
    act(() => { callbacks.onSuccess() })
    act(() => { callbacks.onError(new Error("falló")) })
    expect(mocks.success).toHaveBeenCalledWith("Equipo asignado")
    expect(mocks.error).toHaveBeenCalledWith("falló")
  })
})
