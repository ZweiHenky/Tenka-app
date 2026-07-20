import { createContext, useContext, useState, useCallback, useRef } from "react"
import type { ReactNode } from "react"
import { View, Text, TouchableOpacity, Animated } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Radius, Pad, Gap } from "@/constants/theme"

type ToastType = "success" | "error" | "info"

interface ToastConfig {
  message: string
  type?: ToastType
  duration?: number
}

interface ToastContextType {
  show: (config: ToastConfig) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("")
  const [type, setType] = useState<ToastType>("info")
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setVisible(false))
  }, [opacity])

  const show = useCallback((config: ToastConfig) => {
    setMessage(config.message)
    setType(config.type ?? "info")
    setVisible(true)

    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start()

    if (timerRef.current) clearTimeout(timerRef.current)
    const duration = config.duration ?? 3000
    if (duration > 0) {
      timerRef.current = setTimeout(hide, duration)
    }
  }, [opacity, hide])

  const success = useCallback((msg: string) => show({ message: msg, type: "success" }), [show])
  const error = useCallback((msg: string) => show({ message: msg, type: "error" }), [show])
  const info = useCallback((msg: string) => show({ message: msg, type: "info" }), [show])

  const iconMap: Record<ToastType, { name: string; color: string }> = {
    success: { name: "check-circle", color: Palette.black },
    error: { name: "error", color: Palette.black },
    info: { name: "info", color: Palette.black },
  }

  const bgMap: Record<ToastType, string> = {
    success: Palette.success + "E6",
    error: Palette.danger + "E6",
    info: Palette.cyan + "E6",
  }

  const borderMap: Record<ToastType, string> = {
    success: Palette.success,
    error: Palette.danger,
    info: Palette.cyan,
  }

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      <View style={{ flex: 1 }}>
        {children}
        {visible ? (
          <Animated.View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: 60,
              left: 16,
              right: 16,
              opacity,
              transform: [{ translateY: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }) }],
              zIndex: 9999,
              elevation: 10,
            }}
          >
            <TouchableOpacity
              onPress={hide}
              activeOpacity={0.9}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Gap.sm,
                backgroundColor: bgMap[type],
                borderWidth: 1,
                borderColor: borderMap[type],
                borderRadius: Radius.lg,
                paddingVertical: Pad.md,
                paddingHorizontal: Pad.base,
              }}
            >
              <MaterialIcons name={iconMap[type].name as any} size={22} color={iconMap[type].color} />
              <Text style={{ flex: 1, fontSize: 14, color: Palette.text, fontWeight: "500" }}>{message}</Text>
              <MaterialIcons name="close" size={18} color={Palette.black} />
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  )
}
