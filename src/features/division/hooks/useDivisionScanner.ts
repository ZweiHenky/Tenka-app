import { useState, useRef } from "react"
import type { BarcodeScanningResult } from "expo-camera"
import { useAssignTeam, useReplaceTeam } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useToast } from "@/shared/components/Toast"
import { teamApi } from "@/features/team/api/teams"
import type { DivisionEquipoByDivision } from "@/features/division-equipo/api/division-equipo"
import type { EquipoResponse } from "@/features/team/api/teams"

interface PendingReplacement {
  source: EquipoResponse
  target: EquipoResponse
}

export function useDivisionScanner(
  divisionId: string,
  links: DivisionEquipoByDivision[],
) {
  const toast = useToast()
  const assignTeam = useAssignTeam()
  const replaceTeam = useReplaceTeam()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState("")
  const [replacementSource, setReplacementSource] = useState<EquipoResponse | null>(null)
  const [pendingReplacement, setPendingReplacement] = useState<PendingReplacement | null>(null)
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
    if (replacementSource?.id === equipoId) {
      setScannerError(`"${replacementSource.nombre}" es el equipo que se reemplazará`)
      return
    }
    if (existing) {
      setScannerError(`"${existing.equipo.nombre}" ya está en esta división`)
      return
    }
    try {
      const target = await teamApi.getById(equipoId)
      if (replacementSource) {
        setPendingReplacement({ source: replacementSource, target })
        setScannerOpen(false)
        setScannerError("")
        scanningLocked.current = false
      } else {
        handleAssign(equipoId)
        handleScannerClose()
      }
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
    if (!pendingReplacement) setReplacementSource(null)
  }

  const handleScannerOpen = (source?: EquipoResponse) => {
    setScannerError("")
    scanningLocked.current = false
    setReplacementSource(source ?? null)
    setPendingReplacement(null)
    setScannerOpen(true)
  }

  const confirmReplacement = () => {
    if (!pendingReplacement || replaceTeam.isPending) return
    replaceTeam.mutate(
      { divisionId, equipoActualId: pendingReplacement.source.id, equipoNuevoId: pendingReplacement.target.id },
      {
        onSuccess: () => {
          toast.success("Equipo reemplazado")
          setPendingReplacement(null)
          setReplacementSource(null)
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }

  const cancelReplacement = () => {
    if (replaceTeam.isPending) return
    setPendingReplacement(null)
    setReplacementSource(null)
    setScannerError("")
    scanningLocked.current = false
  }

  return {
    scannerOpen,
    scannerError,
    scannerMode: replacementSource ? "replacement" as const : "assign" as const,
    pendingReplacement,
    assignTeamIsPending: assignTeam.isPending,
    replaceTeamIsPending: replaceTeam.isPending,
    handleBarcodeScanned,
    handleScannerRetry,
    handleScannerClose,
    handleScannerOpen,
    confirmReplacement,
    cancelReplacement,
  }
}
