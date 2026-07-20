import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Pressable } from "react-native"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

type Variant = "danger" | "warning" | "default"

interface Props {
  visible: boolean
  title: string
  message: string
  highlightText?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

const confirmColor: Record<Variant, string> = {
  danger: Palette.danger,
  warning: Palette.warning,
  default: Palette.cyan,
}

function renderMessage(message: string, highlight?: string) {
  if (!highlight) return <Text style={{ fontSize: 14, fontFamily: Fonts.sans, color: Palette.textSecondary, textAlign: "center", lineHeight: 20 }}>{message}</Text>
  const idx = message.indexOf(highlight)
  if (idx === -1) return <Text style={{ fontSize: 14, fontFamily: Fonts.sans, color: Palette.textSecondary, textAlign: "center", lineHeight: 20 }}>{message}</Text>
  return (
    <Text style={{ fontSize: 14, fontFamily: Fonts.sans, color: Palette.textSecondary, textAlign: "center", lineHeight: 20 }}>
      {message.slice(0, idx)}
      <Text style={{ fontFamily: Fonts.semiBold, color: Palette.cyan }}>{highlight}</Text>
      {message.slice(idx + highlight.length)}
    </Text>
  )
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  highlightText,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onClose}>
      <Pressable
        onPress={loading ? undefined : onClose}
        style={{ flex: 1, backgroundColor: Palette.overlay, justifyContent: "center", alignItems: "center", padding: Pad.xl }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: 340,
            backgroundColor: Palette.surface,
            borderRadius: Radius.xl,
            borderWidth: 1,
            borderColor: Palette.border,
            padding: Pad.lg,
            gap: Gap.md,
          }}
        >
          <Text style={{ fontSize: 18, fontFamily: Fonts.display, color: Palette.text, textAlign: "center" }}>
            {title}
          </Text>
          {renderMessage(message, highlightText)}
          <View style={{ flexDirection: "row", gap: Gap.sm, marginTop: Gap.sm }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: Pad.md,
                borderRadius: Radius.md,
                backgroundColor: Palette.surfaceLight,
                borderWidth: 1,
                borderColor: Palette.border,
                alignItems: "center",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 15 }}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: Pad.md,
                borderRadius: Radius.md,
                backgroundColor: confirmColor[variant] + "20",
                borderWidth: 1,
                borderColor: confirmColor[variant],
                alignItems: "center",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={confirmColor[variant]} />
              ) : (
                <Text style={{ color: confirmColor[variant], fontFamily: Fonts.semiBold, fontSize: 15 }}>
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
