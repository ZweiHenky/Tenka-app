import { useState, useMemo } from "react"
import { View, Text, Image, TouchableOpacity, TextInput } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { formatSaldoPendiente } from "@/features/division/utils/teamSaldo"
import TeamSaldoEditor from "@/features/division/components/TeamSaldoEditor"

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

interface TeamItem {
  id: string
  nombre: string
  logo: string | null
  saldoPendiente?: string
}

interface Props {
  divisionId: string
  assigned: TeamItem[]
  arbitrajePagado: string[]
  onRemove: (nombre: string, id: string) => void
  onToggleArbitraje: (id: string) => void
  flat?: boolean
}

export default function TeamListCard({ divisionId, assigned, arbitrajePagado, onRemove, onToggleArbitraje, flat }: Props) {
  const [minimized, setMinimized] = useState(false)
  const [search, setSearch] = useState("")
  const [editingSaldoId, setEditingSaldoId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return assigned
    const q = normalize(search.trim())
    return assigned.filter((t) => normalize(t.nombre).includes(q))
  }, [assigned, search])

  const sorted = useMemo(() => {
    const checked: TeamItem[] = []
    const unchecked: TeamItem[] = []
    for (const t of filtered) {
      if (arbitrajePagado.includes(t.id)) {
        checked.push(t)
      } else {
        unchecked.push(t)
      }
    }
    const cmp = (a: TeamItem, b: TeamItem) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
    unchecked.sort(cmp)
    checked.sort(cmp)
    return [...unchecked, ...checked]
  }, [filtered, arbitrajePagado])

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...(flat ? { paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border } : { backgroundColor: Palette.cyan, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        <Text style={{ color: flat ? Palette.text : Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>
          {flat ? `Seleccionados ${arbitrajePagado.length}/${assigned.length}` : `Equipos (${assigned.length})`}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        {flat ? null : (
          <TouchableOpacity onPress={() => setMinimized((s) => !s)} style={{ padding: 4 }}>
            <MaterialIcons name={minimized ? "expand-more" : "expand-less"} size={24} color={Palette.dark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const content = (
    <View style={{ gap: Gap.md }}>
      {flat ? (
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar equipo..."
          placeholderTextColor={Palette.textMuted}
          style={{ backgroundColor: Palette.surface, borderRadius: Radius.md, paddingHorizontal: Pad.base, height: 40, color: Palette.text, fontSize: 14, fontFamily: Fonts.sans, borderWidth: 1, borderColor: Palette.border }}
        />
      ) : null}
      {sorted.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: Pad.lg, gap: Gap.sm }}>
          <MaterialIcons name="sports" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.textMuted, fontSize: 14, textAlign: "center" }}>
            {assigned.length === 0 ? "Presiona el código QR para agregar equipos" : "No se encontraron equipos"}
          </Text>
        </View>
      ) : (
        sorted.map((t) => (
          <View key={t.id} style={{ gap: Gap.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.sm, gap: Gap.sm }}>
            <TouchableOpacity onPress={() => onToggleArbitraje(t.id)} style={{ padding: 4 }}>
              <MaterialIcons name={arbitrajePagado.includes(t.id) ? "check-box" : "check-box-outline-blank"} size={26} color={arbitrajePagado.includes(t.id) ? Palette.cyan : Palette.textMuted} />
            </TouchableOpacity>
            <Image source={t.logo ? { uri: t.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 44, height: 44, borderRadius: Radius.lg }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: Fonts.bold, color: Palette.text }}>{t.nombre}</Text>
              <Text style={{ fontSize: 12, fontFamily: Fonts.sans, color: Number(t.saldoPendiente) > 0 ? Palette.warning : Palette.success }}>
                {formatSaldoPendiente(t.saldoPendiente)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setEditingSaldoId((current) => current === t.id ? null : t.id)}
              accessibilityLabel={`Editar saldo de ${t.nombre}`}
              accessibilityState={{ expanded: editingSaldoId === t.id }}
              style={{ width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}
            >
              <MaterialIcons name={editingSaldoId === t.id ? "expand-less" : "edit"} size={19} color={Palette.cyan} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar ${t.nombre} de la división`} onPress={() => onRemove(t.nombre, t.id)} style={{ padding: 10 }}>
              <MaterialIcons name="delete-outline" size={24} color={Palette.danger} />
            </TouchableOpacity>
          </View>
          {editingSaldoId === t.id ? (
            <TeamSaldoEditor divisionId={divisionId} team={t} onClose={() => setEditingSaldoId(null)} />
          ) : null}
          </View>
        ))
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
    </View>
  )
}
