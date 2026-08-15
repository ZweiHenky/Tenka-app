// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDivisionScanner } from "../useDivisionScanner"

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  getTeam: vi.fn(),
}))

vi.mock("@/features/division-equipo/hooks/useDivisionEquipo", () => ({
  useAssignTeam: () => ({ mutate: mocks.mutate, isPending: false }),
}))
vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}))
vi.mock("@/features/team/api/teams", () => ({
  teamApi: { getById: mocks.getTeam },
}))

const link = {
  divisionId: "division",
  equipoId: "team",
  equipo: { id: "team", nombre: "Equipo", logo: null, codigo: "TEAM", esPropio: false },
}

describe("useDivisionScanner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an empty QR without requesting the team list route", async () => {
    const { result } = renderHook(() => useDivisionScanner("division", []))

    await act(async () => { await result.current.handleBarcodeScanned({ data: "   " } as never) })

    expect(result.current.scannerError).toBe("El código QR no contiene un equipo válido")
    expect(mocks.getTeam).not.toHaveBeenCalled()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it("reports an unknown QR and unlocks scanning on retry", async () => {
    mocks.getTeam.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce(link.equipo)
    const { result } = renderHook(() => useDivisionScanner("division", []))

    await act(async () => { await result.current.handleBarcodeScanned({ data: "unknown" } as never) })
    expect(result.current.scannerError).toBe("No se encontró ningún equipo con ese código")

    await act(async () => { await result.current.handleBarcodeScanned({ data: "team" } as never) })
    expect(mocks.mutate).not.toHaveBeenCalled()

    act(() => { result.current.handleScannerRetry() })
    await act(async () => { await result.current.handleBarcodeScanned({ data: "team" } as never) })
    expect(mocks.mutate).toHaveBeenCalledOnce()
  })

  it("reports when the scanned team is already assigned", async () => {
    const { result } = renderHook(() => useDivisionScanner(
      "division",
      [link],
    ))

    await act(async () => { await result.current.handleBarcodeScanned({ data: "team" } as never) })

    expect(result.current.scannerError).toBe('"Equipo" ya está en esta división')
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(mocks.getTeam).not.toHaveBeenCalled()
  })

  it("assigns a valid team, closes the scanner and forwards mutation feedback", async () => {
    mocks.getTeam.mockResolvedValue(link.equipo)
    const { result } = renderHook(() => useDivisionScanner("division", []))
    act(() => { result.current.handleScannerOpen() })
    expect(result.current.scannerOpen).toBe(true)

    await act(async () => { await result.current.handleBarcodeScanned({ data: " team " } as never) })

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
