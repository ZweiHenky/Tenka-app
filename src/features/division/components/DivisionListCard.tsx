import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface DivisionItem {
  id: string
  nombre: string
}

interface Props {
  divisions: DivisionItem[]
  onNavigate: (id: string) => void
  onEdit: (division: DivisionItem) => void
  onDelete: (id: string, nombre: string) => void
  onAdd: () => void
}

export default function DivisionListCard({ divisions, onNavigate, onEdit, onDelete, onAdd }: Props) {
  return (
    <View style={{ gap: Gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
        <Text style={{ fontSize: 15, fontFamily: Fonts.semiBold, color: Palette.text }}>Divisiones ({divisions.length})</Text>
        <TouchableOpacity onPress={onAdd} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="add" size={16} color={Palette.black} />
        </TouchableOpacity>
      </View>
      {divisions.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: Pad.lg, gap: Gap.sm }}>
          <MaterialIcons name="sports-soccer" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans, textAlign: "center" }}>Esta liga no tiene divisiones</Text>
          <TouchableOpacity onPress={onAdd} style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ color: Palette.black, fontSize: 13, fontFamily: Fonts.semiBold }}>Crear primera división</Text>
          </TouchableOpacity>
        </View>
      ) : (
        divisions.map((d) => (
          <TouchableOpacity key={d.id} activeOpacity={0.7} onPress={() => onNavigate(d.id)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.sm, gap: Gap.sm }}>
            <View style={{ flex: 1, paddingLeft: Pad.sm }}>
              <Text style={{ fontSize: 15, fontFamily: Fonts.bold, color: Palette.text }}>{d.nombre}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <TouchableOpacity onPress={() => onEdit(d)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.surface, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="edit" size={16} color={Palette.cyan} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(d.id, d.nombre)} style={{ padding: 4 }}>
                <MaterialIcons name="delete" size={20} color={Palette.danger} />
              </TouchableOpacity>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
          </TouchableOpacity>
        ))
      )}
    </View>
  )
}
