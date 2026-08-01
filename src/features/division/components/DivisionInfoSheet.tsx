import { View, Text } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"

interface Props {
  visible: boolean
  onClose: () => void
  nombre: string
  assignedTeamCount: number
  maxEquipos: number
  estadoNombre: string
  isBorrador: boolean
  tipoCompNombre: string
  categoriaNombre: string
  tipoNombre: string
  arbitraje: number
  diasPartido: string | null
  horarioPartido: string | null
  duracionPartido: number | null
  descanso: number | null
}

export default function DivisionInfoSheet({
  visible,
  onClose,
  nombre,
  assignedTeamCount,
  maxEquipos,
  estadoNombre,
  isBorrador,
  tipoCompNombre,
  categoriaNombre,
  tipoNombre,
  arbitraje,
  diasPartido,
  horarioPartido,
  duracionPartido,
  descanso,
}: Props) {
  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title="Información" snapPoints={["65%"]} scrollable>
      <View style={{ gap: Gap.lg }}>
        <View style={{ gap: Gap.sm }}>
          <Text style={{ fontSize: 22, fontFamily: Fonts.displayBold, color: Palette.text }}>{nombre}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <View style={{ backgroundColor: isBorrador ? Palette.warning10 : Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
              <Text style={{ fontSize: 12, fontFamily: Fonts.semiBold, color: isBorrador ? Palette.warning : Palette.cyan }}>{estadoNombre}</Text>
            </View>
            <Text style={{ fontSize: 14, color: Palette.textSecondary, fontFamily: Fonts.sans }}>{tipoCompNombre}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.md, borderWidth: 1, borderColor: Palette.border }}>
          <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.cyan, textTransform: "uppercase", letterSpacing: 0.5 }}>Equipos</Text>
          <Text style={{ fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text }}>
            {assignedTeamCount}
            <Text style={{ fontSize: 16, fontFamily: Fonts.sans, color: Palette.textMuted }}> de {maxEquipos} equipos</Text>
          </Text>
          <View style={{ height: 8, backgroundColor: Palette.dark, borderRadius: Radius.full, overflow: "hidden" }}>
            <View style={{ width: `${Math.min((assignedTeamCount / Math.max(maxEquipos, 1)) * 100, 100)}%`, height: "100%", backgroundColor: Palette.cyan, borderRadius: Radius.full }} />
          </View>
          <Text style={{ fontSize: 12, color: Palette.textMuted, fontFamily: Fonts.sans }}>
            {maxEquipos - assignedTeamCount > 0 ? `${maxEquipos - assignedTeamCount} lugares disponibles` : "Completo"}
          </Text>
        </View>

        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.md, borderWidth: 1, borderColor: Palette.border }}>
          <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.cyan, textTransform: "uppercase", letterSpacing: 0.5 }}>Configuración</Text>
          <View style={{ gap: Gap.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="category" size={18} color={Palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Categoría</Text>
                <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>{categoriaNombre}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="sports-soccer" size={18} color={Palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Modalidad</Text>
                <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>{tipoNombre}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="emoji-events" size={18} color={Palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Competencia</Text>
                <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>{tipoCompNombre}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="attach-money" size={18} color={Palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Arbitraje</Text>
                <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>${arbitraje} por partido</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.md, borderWidth: 1, borderColor: Palette.border }}>
          <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.cyan, textTransform: "uppercase", letterSpacing: 0.5 }}>Programación</Text>
          <View style={{ gap: Gap.sm }}>
            {diasPartido ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="calendar-today" size={18} color={Palette.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Días de juego</Text>
                  <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>{diasPartido}</Text>
                </View>
              </View>
            ) : null}
            {horarioPartido ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="access-time" size={18} color={Palette.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Horario</Text>
                  <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>{horarioPartido}</Text>
                </View>
              </View>
            ) : null}
            <View style={{ height: 1, backgroundColor: Palette.border, marginVertical: Gap.sm }} />
            {duracionPartido != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="timer" size={18} color={Palette.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Duración del partido</Text>
                  <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>{duracionPartido} minutos de juego</Text>
                </View>
              </View>
            ) : null}
            {descanso != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <View style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="coffee" size={18} color={Palette.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Tiempo libre entre partidos</Text>
                  <Text style={{ fontSize: 13, fontFamily: Fonts.sans, color: Palette.text }}>
                    {descanso > 0 ? `${descanso} minutos entre partidos` : "Sin descanso"}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </AppBottomSheetModal>
  )
}
