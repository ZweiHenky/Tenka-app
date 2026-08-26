import { useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import type { BarcodeScanningResult } from "expo-camera"

interface Props {
  visible: boolean
  onBarcodeScanned: (result: BarcodeScanningResult) => void
  onClose: () => void
  scannerError?: string
  onRetry?: () => void
  promptText?: string
}

export default function QRScannerModal({ visible, onBarcodeScanned, onClose, scannerError, onRetry, promptText = "Escanea el código QR del equipo" }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [restarting, setRestarting] = useState(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [])

  const handleRetry = () => {
    onRetry?.()
    setRestarting(true)
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null
      setRestarting(false)
    }, 1000)
  }

  const shouldPause = Boolean(scannerError) || restarting

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        {cameraPermission?.granted ? (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={shouldPause ? undefined : onBarcodeScanned}
            />
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-between", paddingTop: 60, paddingBottom: 80, paddingHorizontal: Pad.xl }}>
              <TouchableOpacity onPress={onClose} style={{ alignSelf: "flex-end", padding: 8 }}>
                <Text style={{ color: Palette.white, fontSize: 18, fontWeight: "600" }}>Cerrar</Text>
              </TouchableOpacity>
              {scannerError ? (
                <View style={{ alignItems: "center", gap: Gap.lg }}>
                  <View style={{ width: 240, backgroundColor: Palette.danger + "E6", borderRadius: Radius.lg, padding: Pad.base, borderWidth: 1, borderColor: Palette.danger, alignItems: "center", gap: Gap.sm }}>
                    <MaterialIcons name="error" size={28} color={Palette.white} />
                    <Text style={{ color: Palette.white, fontSize: 15, textAlign: "center", fontWeight: "500" }}>{scannerError}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleRetry}
                    style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, paddingHorizontal: Pad.xl }}
                  >
                    <Text style={{ color: Palette.black, fontWeight: "700", fontSize: 15 }}>Escanear otro</Text>
                  </TouchableOpacity>
                </View>
              ) : restarting ? (
                <View style={{ alignItems: "center", gap: Gap.md }}>
                  <ActivityIndicator size="large" color={Palette.cyan} />
                  <Text style={{ color: Palette.textSecondary, fontSize: 14 }}>Preparando cámara...</Text>
                </View>
              ) : (
                <View style={{ alignItems: "center" }}>
                  <View style={{ width: 240, height: 240, borderWidth: 3, borderColor: Palette.cyan, borderRadius: Radius.xl }} />
                  <Text style={{ color: Palette.white, fontSize: 16, marginTop: Gap.lg, textAlign: "center" }}>
                    {promptText}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
            <Text style={{ color: Palette.white, fontSize: 18, fontWeight: "600", marginBottom: Gap.base, textAlign: "center" }}>
              Permiso de cámara requerido
            </Text>
            <Text style={{ color: Palette.textSecondary, fontSize: 14, marginBottom: 24, textAlign: "center" }}>
              Para escanear el código QR necesitamos acceso a la cámara
            </Text>
            <TouchableOpacity onPress={requestCameraPermission} style={{ paddingVertical: Pad.md, paddingHorizontal: Pad.xl, borderRadius: Radius.md, backgroundColor: Palette.cyan }}>
              <Text style={{ color: Palette.black, fontWeight: "700", fontSize: 15 }}>Conceder permiso</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  )
}
