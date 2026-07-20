import { View, Text, Image, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface Props {
  id: string
  nombre: string
  logo: string | null
  onPress: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string, nombre: string, logo: string | null) => void
  detailButtonRef?: React.RefObject<any>
  editButtonRef?: React.RefObject<any>
}

export default function LeagueCard({ id, nombre, logo, onPress, onEdit, onDelete, detailButtonRef, editButtonRef }: Props) {
  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", padding: Pad.base, alignItems: "center", gap: Gap.base }}>
        <TouchableOpacity ref={detailButtonRef} onPress={() => onPress(id)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.base, flex: 1 }}>
          <View style={{ width: 52, height: 52, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight, borderWidth: 2, borderColor: Palette.cyan }}>
            <Image source={logo ? { uri: logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 52, height: 52 }} resizeMode="cover" />
          </View>
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.bold, flex: 1 }}>{nombre}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "center" }}>
          <TouchableOpacity ref={editButtonRef} onPress={() => onEdit(id)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="edit" size={16} color={Palette.cyan} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(id, nombre, logo)} style={{ padding: 4 }}>
            <MaterialIcons name="delete" size={20} color={Palette.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
