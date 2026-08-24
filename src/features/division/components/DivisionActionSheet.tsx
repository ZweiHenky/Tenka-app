
import { useEffect, useState } from "react"
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { useDebounce } from "@/shared/hooks/useDebounce"

interface Props {
  visible: boolean
  onClose: () => void
  isBorrador: boolean
  isEnCurso: boolean
  /** `FINALIZADA` o `CANCELADA`: el servidor rechaza toda escritura. */
  isSoloLectura: boolean
  estadoNombre: string
  tieneEliminatorias: boolean
  hasRondas: boolean
  /** El cuadro terminó: ya hay una final de la que sale un campeón. */
  cuadroCompleto: boolean
  nombreCampeon: string | null
  isPending: boolean
  registrarParticipaciones: boolean
  registrarParticipacionesPending: boolean
  onToggleRegistrarParticipaciones: (value: boolean) => void
  registrarGoleo: boolean
  registrarGoleoPending: boolean
  onToggleRegistrarGoleo: (value: boolean) => void
  /** Partidos exigidos para alinear en eliminatorias. 0 = sin requisito. */
  minPartidosEliminatoria: number
  minPartidosPending: boolean
  onChangeMinPartidos: (value: number) => void
  onPublish: () => void
  onRevertToBorrador: () => void
  onGeneratePlayoffs: () => void
  onDeletePlayoffs: () => void
  onAssignCampeon: () => void
  onRemoveCampeon: () => void
  onReabrir: () => void
  onReset: () => void
  dataLoading?: boolean
}

export default function DivisionActionSheet({
  visible,
  onClose,
  isBorrador,
  isEnCurso,
  isSoloLectura,
  estadoNombre,
  tieneEliminatorias,
  hasRondas,
  cuadroCompleto,
  nombreCampeon,
  isPending,
  registrarParticipaciones,
  registrarParticipacionesPending,
  onToggleRegistrarParticipaciones,
  registrarGoleo,
  registrarGoleoPending,
  onToggleRegistrarGoleo,
  minPartidosEliminatoria,
  minPartidosPending,
  onChangeMinPartidos,
  onPublish,
  onRevertToBorrador,
  onGeneratePlayoffs,
  onDeletePlayoffs,
  onAssignCampeon,
  onRemoveCampeon,
  onReabrir,
  onReset,
  dataLoading,
}: Props) {
  /**
   * El mínimo se edita en local y se guarda con retraso.
   *
   * Antes cada toque disparaba una petición y el número se sustituía por el spinner, así que ir
   * de 0 a 5 era tocar y esperar cinco veces. Ahora el número responde al instante y sale una
   * sola petición cuando el usuario deja de tocar.
   */
  const [minLocal, setMinLocal] = useState(minPartidosEliminatoria)
  const [minGuardado, setMinGuardado] = useState(minPartidosEliminatoria)
  const minDiferido = useDebounce(minLocal, 600)

  // Ajuste durante el render, no en un efecto: si el guardado falla y la división vuelve a su valor
  // anterior, el contador tiene que reflejarlo en vez de quedarse mostrando un número que no se
  // guardó. Hacerlo con `useEffect` dispara un render en cascada y el lint lo rechaza.
  if (minGuardado !== minPartidosEliminatoria) {
    setMinGuardado(minPartidosEliminatoria)
    setMinLocal(minPartidosEliminatoria)
  }

  useEffect(() => {
    if (minDiferido !== minPartidosEliminatoria) onChangeMinPartidos(minDiferido)
    // `onChangeMinPartidos` se recrea en cada render de la pantalla; incluirlo re-dispararía
    // el guardado en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDiferido, minPartidosEliminatoria])

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title="Opciones de división" snapPoints={["80%"]} scrollable>
      <View style={{ gap: Gap.md }}>
        {dataLoading ? <ActivityIndicator color={Palette.cyan} /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingBottom: Pad.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
          <Text style={{ fontSize: 13, color: Palette.textSecondary, fontFamily: Fonts.sans }}>Estado actual:</Text>
          <View style={{ backgroundColor: isSoloLectura ? Palette.surfaceLight : isBorrador ? Palette.warning10 : Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
            <Text style={{ fontSize: 12, fontFamily: Fonts.semiBold, color: isSoloLectura ? Palette.textMuted : isBorrador ? Palette.warning : Palette.cyan }}>{estadoNombre}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border, gap: Gap.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="groups" size={22} color={Palette.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Registro de jugadores</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Pide seleccionar a los jugadores que participaron</Text>
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

          {/* Solo con el registro de participantes encendido: sin él no existe el dato de quién
              jugó cada partido, así que un mínimo dejaría fuera al plantel entero. */}
          {registrarParticipaciones ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
              <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="rule" size={22} color={Palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Mínimo para eliminatorias</Text>
                <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>
                  {minLocal > 0
                    ? `Partidos de liga que un jugador debe tener para alinear en el cuadro`
                    : "Sin requisito: cualquier jugador del plantel puede alinear"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                {minPartidosPending ? <ActivityIndicator size="small" color={Palette.cyan} /> : null}
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityLabel="Bajar el mínimo"
                  onPress={() => setMinLocal((actual) => Math.max(0, actual - 1))}
                  disabled={minLocal === 0}
                  style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center", opacity: minLocal === 0 ? 0.4 : 1 }}
                >
                  <MaterialIcons name="remove" size={18} color={Palette.text} />
                </TouchableOpacity>
                <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.semiBold, minWidth: 20, textAlign: "center" }}>{minLocal}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityLabel="Subir el mínimo"
                  onPress={() => setMinLocal((actual) => Math.min(99, actual + 1))}
                  style={{ width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center" }}
                >
                  <MaterialIcons name="add" size={18} color={Palette.cyan} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={{ height: 1, backgroundColor: Palette.border }} />

          {/* Apagarlo esconde la pestaña Goleo y el editor de goleadores, pero no borra nada:
              lo ya capturado se congela y reaparece al volver a encenderlo. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="sports-soccer" size={22} color={Palette.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Registrar tabla de goleo</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Pide asignar los goles a los jugadores al finalizar cada partido</Text>
            </View>
            {registrarGoleoPending ? <ActivityIndicator color={Palette.cyan} /> : (
              <Switch
                value={registrarGoleo}
                onValueChange={onToggleRegistrarGoleo}
                disabled={registrarGoleoPending}
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

        {isSoloLectura ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onReabrir}
            disabled={isPending}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border, opacity: isPending ? 0.6 : 1 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.success, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="lock-open" size={22} color={Palette.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>Reabrir división</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>Vuelve a En Curso para poder corregir resultados</Text>
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

        {/* Visible en cuanto hay cuadro, pero deshabilitada hasta que la final tenga resultado:
            escondida no se descubría que la función existe, y habilitada solo llevaría al 422. */}
        {!dataLoading && hasRondas ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onAssignCampeon}
            disabled={!cuadroCompleto}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border, opacity: cuadroCompleto ? 1 : 0.5 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: cuadroCompleto ? Palette.warning : Palette.surface, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="workspace-premium" size={22} color={cuadroCompleto ? Palette.dark : Palette.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: cuadroCompleto ? Palette.text : Palette.textMuted, fontSize: 15, fontFamily: Fonts.semiBold }}>{nombreCampeon ? "Editar campeón" : "Asignar campeón"}</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }} numberOfLines={1}>
                {cuadroCompleto ? nombreCampeon ?? "Elige al ganador del torneo" : "Termina la final para poder asignarlo"}
              </Text>
            </View>
            {cuadroCompleto ? <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} /> : null}
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

        {!dataLoading && nombreCampeon ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRemoveCampeon}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.danger }}
          >
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Palette.danger, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="delete-outline" size={22} color={Palette.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.danger, fontSize: 15, fontFamily: Fonts.semiBold }}>Quitar campeón</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>La división queda sin ganador</Text>
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
