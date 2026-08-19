
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"

interface Props {
  visible: boolean
  onClose: () => void
  isBorrador: boolean
  isEnCurso: boolean
  estadoNombre: string
  tieneEliminatorias: boolean
  hasRondas: boolean
  isPending: boolean
  registrarParticipaciones: boolean
  registrarParticipacionesPending: boolean
  onToggleRegistrarParticipaciones: (value: boolean) => void
  onPublish: () => void
  onRevertToBorrador: () => void
  onGeneratePlayoffs: () => void
  onDeletePlayoffs: () => void
  onReset: () => void
  dataLoading?: boolean
}

export default function DivisionActionSheet({
  visible,
  onClose,
  isBorrador,
  isEnCurso,
  estadoNombre,
  tieneEliminatorias,
  hasRondas,
  isPending,
  registrarParticipaciones,
  registrarParticipacionesPending,
  onToggleRegistrarParticipaciones,
  onPublish,
  onRevertToBorrador,
  onGeneratePlayoffs,
  onDeletePlayoffs,
  onReset,
  dataLoading,
}: Props) {

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title="Opciones de división" snapPoints={["80%"]} scrollable>
      <View style={{ gap: Gap.md }}>
        {dataLoading ? <ActivityIndicator color={Palette.cyan} /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
          <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.sans }}>Estado actual:</Text>
          <View style={{ backgroundColor: isBorrador ? Palette.warning10 : Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
            <Text style={{ fontSize: 12, fontFamily: Fonts.semiBold, color: isBorrador ? Palette.warning : Palette.cyan }}>{estadoNombre}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border, gap: Gap.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="groups" size={22} color={Palette.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Registrar jugadores participantes</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Pide seleccionar a los jugadores que participaron al finalizar cada partido</Text>
            </View>
            {registrarParticipacionesPending ? <ActivityIndicator color={Palette.cyan} /> : (
              <Switch
                value={registrarParticipaciones}
                onValueChange={onToggleRegistrarParticipaciones}
                disabled={registrarParticipacionesPending}
                trackColor={{ false: Palette.dark60, true: Palette.cyan }}
                thumbColor={Palette.white}
              />
            )}
          </View>
        </View>

        {isBorrador ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPublish}
            disabled={isPending}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border, opacity: isPending ? 0.6 : 1 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.success, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="publish" size={22} color={Palette.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Publicar división</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Hacer visible para los usuarios</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
          </TouchableOpacity>
        ) : null}

        {isEnCurso ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRevertToBorrador}
            disabled={isPending}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border, opacity: isPending ? 0.6 : 1 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.warning, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="unpublished" size={22} color={Palette.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Regresar a borrador</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Ocultar de los usuarios</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
          </TouchableOpacity>
        ) : null}

        {tieneEliminatorias && !dataLoading && !hasRondas ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onGeneratePlayoffs}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border }}
          >
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="emoji-events" size={22} color={Palette.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Generar eliminatorias</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Crear rondas y cruces</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
          </TouchableOpacity>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, paddingTop: Pad.sm }}>
          <View style={{ flex: 1, height: 1, backgroundColor: Palette.danger }} />
          <Text style={{ color: Palette.danger, fontSize: 11, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Zona de riesgo</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Palette.danger }} />
        </View>

        {!dataLoading && hasRondas ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDeletePlayoffs}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.danger }}
          >
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.danger, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="delete-outline" size={22} color={Palette.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.danger, fontSize: 15, fontFamily: Fonts.semiBold }}>Eliminar eliminatorias</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Borra todas las rondas y cruces</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onReset}
          style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.danger }}
        >
          <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.danger, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="restart-alt" size={22} color={Palette.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Palette.danger, fontSize: 15, fontFamily: Fonts.semiBold }}>Reiniciar división</Text>
            <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Borra jornadas, partidos y estadísticas</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
        </TouchableOpacity>
      </View>
    </AppBottomSheetModal>
  )
}
