import { useState } from "react"
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from "react-native"
import type { LigaCanchaRef } from "@/domain/interfaces/league"
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
  multiplesCanchas: boolean
  canchas: LigaCanchaRef[]
  canchaUnicaId: string | null
  canchaUnicaPending: boolean
  onSelectCanchaUnica: (canchaId: string) => void
  onClearCanchaUnica: () => void
  registrarParticipaciones: boolean
  registrarParticipacionesPending: boolean
  onToggleRegistrarParticipaciones: (value: boolean) => void
  onPublish: () => void
  onRevertToBorrador: () => void
  onGeneratePlayoffs: () => void
  onDeletePlayoffs: () => void
  onReset: () => void
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
  multiplesCanchas,
  canchas,
  canchaUnicaId,
  canchaUnicaPending,
  onSelectCanchaUnica,
  onClearCanchaUnica,
  registrarParticipaciones,
  registrarParticipacionesPending,
  onToggleRegistrarParticipaciones,
  onPublish,
  onRevertToBorrador,
  onGeneratePlayoffs,
  onDeletePlayoffs,
  onReset,
}: Props) {
  const [selectingCourt, setSelectingCourt] = useState(false)

  return (
    <AppBottomSheetModal visible={visible} onClose={() => { setSelectingCourt(false); onClose() }} title="Opciones de división" snapPoints={["80%"]} scrollable>
      <View style={{ gap: Gap.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
          <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.sans }}>Estado actual:</Text>
          <View style={{ backgroundColor: isBorrador ? Palette.warning10 : Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
            <Text style={{ fontSize: 12, fontFamily: Fonts.semiBold, color: isBorrador ? Palette.warning : Palette.cyan }}>{estadoNombre}</Text>
          </View>
        </View>

        {multiplesCanchas ? (
          <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border, gap: Gap.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
              <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="stadium" size={22} color={Palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Usar una sola cancha</Text>
                <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Mantiene todas las jornadas nuevas en una cancha fija</Text>
              </View>
              {canchaUnicaPending ? <ActivityIndicator color={Palette.cyan} /> : (
                <Switch
                  value={!!canchaUnicaId}
                  onValueChange={(enabled) => {
                    if (enabled) setSelectingCourt(true)
                    else onClearCanchaUnica()
                  }}
                  disabled={canchaUnicaPending}
                  trackColor={{ false: Palette.dark60, true: Palette.cyan }}
                  thumbColor={Palette.white}
                />
              )}
            </View>

            {!canchaUnicaId && selectingCourt ? (
              <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>Selecciona una cancha para activar la restricción.</Text>
            ) : null}

            {canchaUnicaId || selectingCourt ? <View style={{ gap: Gap.sm }}>
              {canchas.filter((cancha) => cancha.activa || cancha.id === canchaUnicaId).map((cancha) => {
                const selected = cancha.id === canchaUnicaId
                return (
                  <TouchableOpacity
                    key={cancha.id}
                    activeOpacity={0.7}
                    disabled={!cancha.activa || canchaUnicaPending}
                    onPress={() => { setSelectingCourt(false); onSelectCanchaUnica(cancha.id) }}
                    style={{ flexDirection: "row", alignItems: "center", padding: Pad.md, borderRadius: Radius.md, borderWidth: 1, borderColor: selected ? Palette.cyan : Palette.border, opacity: cancha.activa ? 1 : 0.6 }}
                  >
                    <Text style={{ flex: 1, color: cancha.activa ? Palette.text : Palette.danger, fontSize: 13, fontFamily: Fonts.semiBold }}>{cancha.nombre}{cancha.activa ? "" : " · Inactiva"}</Text>
                    {selected ? <MaterialIcons name="check-circle" size={20} color={cancha.activa ? Palette.cyan : Palette.danger} /> : null}
                  </TouchableOpacity>
                )
              })}
            </View> : null}
            {canchaUnicaId && !canchas.some((cancha) => cancha.id === canchaUnicaId && cancha.activa) ? (
              <Text style={{ color: Palette.danger, fontSize: 12, fontFamily: Fonts.sans }}>La cancha fija ya no está activa. Selecciona otra antes de generar una jornada.</Text>
            ) : null}
          </View>
        ) : null}

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

        {tieneEliminatorias && !hasRondas ? (
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

        {hasRondas ? (
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
