import { useState, type ReactNode } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface JornadaItem {
  id: string
  numero: number
}

interface Props {
  jornadas: JornadaItem[]
  disabled?: boolean
  disabledMessage?: string
  onNavigate: (jornadaId: string) => void
  onDelete: (jornadaId: string, numero: number) => void
  children?: ReactNode
  flat?: boolean
}

export default function JornadaListCard({ jornadas, disabled, disabledMessage, onNavigate, onDelete, children, flat }: Props) {
  const [minimized, setMinimized] = useState(false)

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...(flat ? { paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border } : { backgroundColor: Palette.cyan, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        <Text style={{ color: flat ? Palette.text : Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>Jornadas ({jornadas.length})</Text>
      </View>
      <View style={{ flexDirection: "row", gap: Gap.sm }}>
        {flat ? null : (
          <TouchableOpacity onPress={() => setMinimized((s) => !s)} style={{ padding: 4 }}>
            <MaterialIcons name={minimized ? "expand-more" : "expand-less"} size={24} color={Palette.dark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const maxNumero = Math.max(...jornadas.map((j) => j.numero), 0)

  const content = (
    <View style={{ gap: Gap.md }}>
      {jornadas.length === 0 ? (
        <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>Aún no hay jornadas generadas</Text>
      ) : (
        jornadas.flatMap((j) => {
          const items: ReactNode[] = []
          if (disabled && disabledMessage && j.numero === maxNumero) {
            items.push(
              <Text key={`msg-${j.id}`} style={{ color: Palette.warning, fontSize: 13, fontFamily: Fonts.medium, textAlign: "center", paddingVertical: Pad.sm }}>{disabledMessage}</Text>
            )
          }
          items.push(
            <TouchableOpacity key={j.id} activeOpacity={0.7} onPress={() => onNavigate(j.id)} style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontFamily: Fonts.bold, color: Palette.text }}>Jornada {j.numero}</Text>
                {j.numero === maxNumero ? (
                  <TouchableOpacity onPress={() => onDelete(j.id, j.numero)} style={{ padding: 4 }}>
                    <MaterialIcons name="delete" size={20} color={Palette.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          )
          return items
        })
      )}
    </View>
  )

  if (flat) {
    return (
      <View style={{ gap: Gap.md }}>
        {header}
        {!minimized ? content : null}
      </View>
    )
  }

  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
      {header}
      {!minimized && <View style={{ padding: Pad.base }}>{content}</View>}
      {children ? <View style={{ paddingHorizontal: Pad.base, paddingBottom: Pad.base }}>{children}</View> : null}
    </View>
  )
}
