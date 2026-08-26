// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDivisionScanner } from "../useDivisionScanner"

const mocks = vi.hoisted(() => ({
  assignMutate: vi.fn(),
  replaceMutate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  getTeam: vi.fn(),
}))

vi.mock("@/features/division-equipo/hooks/useDivisionEquipo", () => ({
  useAssignTeam: () => ({ mutate: mocks.assignMutate, isPending: false }),
  useReplaceTeam: () => ({ mutate: mocks.replaceMutate, isPending: false }),
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
    expect(mocks.assignMutate).not.toHaveBeenCalled()
  })

  it("reports an unknown QR and unlocks scanning on retry", async () => {
    mocks.getTeam.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce(link.equipo)
    const { result } = renderHook(() => useDivisionScanner("division", []))

    await act(async () => { await result.current.handleBarcodeScanned({ data: "unknown" } as never) })
    expect(result.current.scannerError).toBe("No se encontró ningún equipo con ese código")

    await act(async () => { await result.current.handleBarcodeScanned({ data: "team" } as never) })
    expect(mocks.assignMutate).not.toHaveBeenCalled()

    act(() => { result.current.handleScannerRetry() })
    await act(async () => { await result.current.handleBarcodeScanned({ data: "team" } as never) })
    expect(mocks.assignMutate).toHaveBeenCalledOnce()
  })

  it("reports when the scanned team is already assigned", async () => {
    const { result } = renderHook(() => useDivisionScanner(
      "division",
      [link],
    ))

    await act(async () => { await result.current.handleBarcodeScanned({ data: "team" } as never) })

    expect(result.current.scannerError).toBe('"Equipo" ya está en esta división')
    expect(mocks.assignMutate).not.toHaveBeenCalled()
    expect(mocks.getTeam).not.toHaveBeenCalled()
  })

  it("assigns a valid team, closes the scanner and forwards mutation feedback", async () => {
    mocks.getTeam.mockResolvedValue(link.equipo)
    const { result } = renderHook(() => useDivisionScanner("division", []))
    act(() => { result.current.handleScannerOpen() })
    expect(result.current.scannerOpen).toBe(true)

    await act(async () => { await result.current.handleBarcodeScanned({ data: " team " } as never) })

    expect(mocks.assignMutate).toHaveBeenCalledWith(
      { divisionId: "division", equipoId: "team" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
    expect(result.current.scannerOpen).toBe(false)

    const callbacks = mocks.assignMutate.mock.calls[0][1]
    act(() => { callbacks.onSuccess() })
    act(() => { callbacks.onError(new Error("falló")) })
    expect(mocks.success).toHaveBeenCalledWith("Equipo asignado")
    expect(mocks.error).toHaveBeenCalledWith("falló")
  })

  it("stages a valid replacement without mutating until confirmation", async () => {
    const target = { ...link.equipo, id: "target", nombre: "Reemplazo" }
    mocks.getTeam.mockResolvedValue(target)
    const { result } = renderHook(() => useDivisionScanner("division", [link]))

    act(() => { result.current.handleScannerOpen(link.equipo) })
    await act(async () => { await result.current.handleBarcodeScanned({ data: "target" } as never) })

    expect(result.current.scannerOpen).toBe(false)
    expect(result.current.pendingReplacement).toEqual({ source: link.equipo, target })
    expect(mocks.assignMutate).not.toHaveBeenCalled()
    expect(mocks.replaceMutate).not.toHaveBeenCalled()

    act(() => { result.current.confirmReplacement() })
    expect(mocks.replaceMutate).toHaveBeenCalledWith(
      { divisionId: "division", equipoActualId: "team", equipoNuevoId: "target" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })

  it("rejects the replacement source and any team already in the division", async () => {
    const otherLink = { ...link, equipoId: "other", equipo: { ...link.equipo, id: "other", nombre: "Otro" } }
    const { result } = renderHook(() => useDivisionScanner("division", [link, otherLink]))
    act(() => { result.current.handleScannerOpen(link.equipo) })

    await act(async () => { await result.current.handleBarcodeScanned({ data: "team" } as never) })
    expect(result.current.scannerError).toBe('"Equipo" es el equipo que se reemplazará')
    act(() => { result.current.handleScannerRetry() })
    await act(async () => { await result.current.handleBarcodeScanned({ data: "other" } as never) })
    expect(result.current.scannerError).toBe('"Otro" ya está en esta división')
    expect(mocks.getTeam).not.toHaveBeenCalled()
  })

  it("clears staged replacement data when confirmation is cancelled", async () => {
    const target = { ...link.equipo, id: "target", nombre: "Reemplazo" }
    mocks.getTeam.mockResolvedValue(target)
    const { result } = renderHook(() => useDivisionScanner("division", [link]))
    act(() => { result.current.handleScannerOpen(link.equipo) })
    await act(async () => { await result.current.handleBarcodeScanned({ data: "target" } as never) })

    act(() => { result.current.cancelReplacement() })

    expect(result.current.pendingReplacement).toBeNull()
    expect(result.current.scannerMode).toBe("assign")
    expect(mocks.replaceMutate).not.toHaveBeenCalled()
  })
})
