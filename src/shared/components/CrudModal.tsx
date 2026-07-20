import { View, Text, TextInput, TouchableOpacity, Keyboard, Platform } from "react-native"
import { useEffect, useState } from "react"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import AppBottomSheetModal from "./AppBottomSheetModal"

type Field = {
  name: string
  label: string
  placeholder?: string
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address"
  required?: boolean
  maxLength?: number
  options?: { label: string; value: string }[]
}

export default function CrudModal({
  visible,
  onClose,
  title,
  fields,
  values,
  onChange,
  onSave,
  saveLabel = "Guardar",
  children,
}: {
  visible: boolean
  onClose: () => void
  title: string
  fields: Field[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
  onSave: () => void
  saveLabel?: string
  children?: React.ReactNode
}) {
  const [keyboardH, setKeyboardH] = useState(0)

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setKeyboardH(e.endCoordinates.height))
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardH(0))
    return () => { show.remove(); hide.remove() }
  }, [])

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title={title} snapPoints={["85%"]}>
          {fields.map((f) => (
            <View key={f.name}>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>
                {f.label}{f.required ? " *" : ""}
              </Text>
              {f.options ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
                  {f.options.map((opt) => {
                    const active = values[f.name] === opt.value
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => onChange(f.name, active ? "" : opt.value)}
                        style={{
                          paddingHorizontal: Pad.base,
                          paddingVertical: Pad.md,
                          borderRadius: Radius.md,
                          backgroundColor: active ? Palette.cyan : Palette.surfaceLight,
                          borderWidth: 1,
                          borderColor: active ? Palette.cyan : Palette.border,
                        }}
                      >
                        <Text style={{ color: active ? Palette.black : Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ) : (
                <TextInput
                  style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                  placeholder={f.placeholder || f.label}
                  placeholderTextColor={Palette.textMuted}
                  keyboardType={f.keyboardType || "default"}
                  maxLength={f.maxLength}
                  value={values[f.name]}
                  onChangeText={(v) => onChange(f.name, v)}
                />
              )}
              {f.maxLength ? (
                <Text style={{ fontSize: 11, color: Palette.textMuted, textAlign: "right", marginTop: 2 }}>
                  {(values[f.name]?.length ?? 0)}/{f.maxLength}
                </Text>
              ) : null}
            </View>
          ))}
          {children}
          <View style={{ flexDirection: "row", gap: Gap.md, marginTop: Gap.lg }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, alignItems: "center" }}
            >
              <Text style={{ color: Palette.danger, fontFamily: Fonts.medium, fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              style={{ flex: 1, paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center" }}
            >
              <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 15 }}>{saveLabel}</Text>
            </TouchableOpacity>
          </View>
          {keyboardH ? <View style={{ height: keyboardH }} /> : null}
    </AppBottomSheetModal>
  )
}
