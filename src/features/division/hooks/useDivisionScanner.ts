import { useState, useRef } from "react"
import type { BarcodeScanningResult } from "expo-camera"
import { useAssignTeam } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useToast } from "@/shared/components/Toast"

export function useDivisionScanner(
  divisionId: string,
  allTeams: { id: string; nombre: string }[],
  links: { equipoId: string }[],
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

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanningLocked.current) return
    scanningLocked.current = true
    const equipoId = data.trim()
    const teamExists = allTeams.find((t) => t.id === equipoId)
    if (teamExists) {
      if (links.some((l) => l.equipoId === equipoId)) {
        setScannerError(`"${teamExists.nombre}" ya está en esta división`)
        return
      }
      handleAssign(equipoId)
      handleScannerClose()
    } else {
      setScannerError("No se encontró ningún equipo con ese código")
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
