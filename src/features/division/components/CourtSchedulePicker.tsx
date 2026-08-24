import { useState } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import {
  courtSelectorOptions,
  TODAS_LAS_CANCHAS,
  type CourtScheduleLine,
} from "@/features/division/utils/court-schedule-selection"

interface Props {
  lines: CourtScheduleLine[]
  selectedId: string | null
  onSelect: (canchaId: string) => void
}

/**
 * Elige de qué cancha se muestran los días y el horario.
 *
 * Tres estados según cuántas canchas tenga configuradas la división:
 *
 *  - **ninguna** (cancha única, o una división anterior a los horarios por cancha): no se dibuja
 *    nada, porque los escalares de la división ya son el horario real;
 *  - **una**: solo el nombre, sin desplegable — el resumen ya es el horario de esa cancha y lo
 *    único que faltaba era decir cuál;
 *  - **dos o más**: el desplegable, con "Todas las canchas" primero.
 *
 * Repite el desplegable en línea que las dos vistas públicas ya usan para elegir división, en vez
 * de introducir otro control distinto para lo mismo.
 */
export default function CourtSchedulePicker({ lines, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const options = courtSelectorOptions(lines)

  if (lines.length === 0) return null

  if (options.length === 0) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
        <MaterialIcons name="stadium" size={16} color={Palette.cyan} />
        <Text style={{ color: Palette.textSecondary, fontSize: 13, fontFamily: Fonts.sans }} numberOfLines={1}>
          {lines[0].nombre}
        </Text>
      </View>
    )
  }

  const current = options.find((option) => option.id === (selectedId ?? TODAS_LAS_CANCHAS)) ?? options[0]

  return (
    // `relative` + `zIndex` para que la lista flotante tape las celdas de abajo. El desplegable de
    // división usa 10, así que este va por debajo para no taparlo cuando los dos están abiertos.
    <View style={{ position: "relative", zIndex: 9 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        // La tarjeta entera es un TouchableOpacity que navega a la liga.
        onPress={(event) => { event.stopPropagation(); setOpen((previo) => !previo) }}
        style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}
      >
        <MaterialIcons name="stadium" size={16} color={Palette.cyan} />
        <Text numberOfLines={1} style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.medium, flex: 1 }}>{current.nombre}</Text>
        <MaterialIcons name={open ? "expand-less" : "expand-more"} size={20} color={Palette.cyan} />
      </TouchableOpacity>

      {open ? (
        <View style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: Gap.sm, backgroundColor: Palette.dark, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          {options.map((option) => {
            const activa = option.id === current.id
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.7}
                onPress={(event) => { event.stopPropagation(); onSelect(option.id); setOpen(false) }}
                style={{ paddingHorizontal: Pad.base, paddingVertical: Pad.md, backgroundColor: activa ? Palette.cyan10 : "transparent" }}
              >
                <Text numberOfLines={1} style={{ color: activa ? Palette.cyan : Palette.text, fontSize: 13, fontFamily: activa ? Fonts.semiBold : Fonts.medium }}>
                  {option.nombre}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
