import { useState, useRef } from "react"
import type { BarcodeScanningResult } from "expo-camera"
import { useAssignTeam } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useToast } from "@/shared/components/Toast"
import { teamApi } from "@/features/team/api/teams"
import type { DivisionEquipoByDivision } from "@/features/division-equipo/api/division-equipo"

export function useDivisionScanner(
  divisionId: string,
  links: DivisionEquipoByDivision[],
) {
  const toast = useToast()
  const assignTeam = useAssignTeam()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState("")
  const scanningLocked = useRef(false)

  const handleAssign = (equipoId: string) => {
    assignTeam.mutate(
      { divisionId, equipoId },
      {
        onSuccess: () => toast.success("Equipo asignado"),
        onError: (e: any) => toast.error(e.message),
      },
    )
  }

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanningLocked.current) return
    scanningLocked.current = true
    const equipoId = data.trim()
    if (!equipoId) {
      setScannerError("El código QR no contiene un equipo válido")
      return
    }
    const existing = links.find((link) => link.equipoId === equipoId)
    if (existing) {
      setScannerError(`"${existing.equipo.nombre}" ya está en esta división`)
      return
    }
    try {
      await teamApi.getById(equipoId)
      handleAssign(equipoId)
      handleScannerClose()
    } catch (error: any) {
      setScannerError(error?.response?.status === 404 ? "No se encontró ningún equipo con ese código" : (error.message || "No se pudo validar el equipo"))
    }
  }

  const handleScannerRetry = () => {
    setScannerError("")
    scanningLocked.current = false
  }

  const handleScannerClose = () => {
    setScannerOpen(false)
    setScannerError("")
    scanningLocked.current = false
  }

  const handleScannerOpen = () => {
    setScannerError("")
    scanningLocked.current = false
    setScannerOpen(true)
  }

  return {
    scannerOpen,
    scannerError,
    assignTeamIsPending: assignTeam.isPending,
    handleBarcodeScanned,
    handleScannerRetry,
    handleScannerClose,
    handleScannerOpen,
  }
}
