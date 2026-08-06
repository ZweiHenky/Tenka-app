import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"

interface Props {
  id: string
  nombre: string
  logo: string | null
  codigo: string
  onQr: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string, nombre: string) => void
  onPress?: (id: string) => void
  qrButtonRef?: React.RefObject<any>
  editButtonRef?: React.RefObject<any>
}

export default function TeamCard({ id, nombre, logo, codigo, onQr, onEdit, onDelete, onPress, qrButtonRef, editButtonRef }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={() => onPress?.(id)} style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", padding: Pad.base, alignItems: "center", gap: Gap.base }}>
        <LogoImage uri={logo} size={52} ring={Palette.cyan} backgroundColor={Palette.surfaceLight} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.bold }}>{nombre}</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium }}>Código #{codigo}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "center" }}>
          <TouchableOpacity ref={qrButtonRef} onPress={() => onQr(id)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="qr-code" size={16} color={Palette.cyan} />
          </TouchableOpacity>
          <TouchableOpacity ref={editButtonRef} onPress={() => onEdit(id)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="edit" size={16} color={Palette.cyan} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(id, nombre)} style={{ padding: 4 }}>
            <MaterialIcons name="delete" size={20} color={Palette.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}
