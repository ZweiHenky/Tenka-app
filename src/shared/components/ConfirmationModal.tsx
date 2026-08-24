import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Pressable, TextInput } from "react-native"
import { useState } from "react"
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
  requireText?: string
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
  requireText,
  onConfirm,
  onClose,
}: Props) {
  const [input, setInput] = useState("")
  const confirmed = requireText === undefined || input.trim().toLowerCase() === requireText.toLowerCase()

  const handleClose = () => {
    setInput("")
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : handleClose}>
      <Pressable
        onPress={loading ? undefined : handleClose}
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
          {requireText !== undefined ? (
            <View>
              <TextInput
                value={input}
                onChangeText={setInput}
                editable={!loading}
                autoCapitalize="sentences"
                autoCorrect={false}
                placeholder={`Escribe "${requireText}" para confirmar`}
                placeholderTextColor={Palette.textMuted}
                style={{
                  backgroundColor: Palette.surfaceLight,
                  borderWidth: 1,
                  borderColor: confirmed ? Palette.cyan : Palette.border,
                  borderRadius: Radius.md,
                  paddingHorizontal: Pad.base,
                  paddingVertical: Pad.md,
                  color: Palette.text,
                  fontFamily: Fonts.sans,
                  fontSize: 15,
                }}
              />
              <Text style={{ fontSize: 12, fontFamily: Fonts.sans, color: Palette.textMuted, marginTop: Gap.sm, textAlign: "center" }}>
                Escribe el texto exacto para habilitar la eliminación.
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: Gap.sm, marginTop: Gap.sm }}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: Pad.md,
                borderRadius: Radius.md,
                backgroundColor: Palette.surfaceLight,
                borderWidth: 1,
                borderColor: Palette.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 15, textAlign: "center" }}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setInput(""); onConfirm() }}
              disabled={loading || !confirmed}
              style={{
                flex: 1,
                paddingVertical: Pad.md,
                borderRadius: Radius.md,
                backgroundColor: confirmColor[variant] + "20",
                borderWidth: 1,
                borderColor: confirmColor[variant],
                alignItems: "center",
                justifyContent: "center",
                opacity: loading || !confirmed ? 0.45 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={confirmColor[variant]} />
              ) : (
                <Text style={{ color: confirmColor[variant], fontFamily: Fonts.semiBold, fontSize: 15, textAlign: "center" }}>
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
