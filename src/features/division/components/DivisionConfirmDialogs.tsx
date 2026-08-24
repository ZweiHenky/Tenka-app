import { Modal, ActivityIndicator, Text, View, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Palette } from "@/constants/theme"
import ConfirmationModal from "@/shared/components/ConfirmationModal"

interface Props {
  pendingTeamRemoval: { nombre: string; equipoId: string } | null
  onConfirmRemoveTeam: () => void
  onCloseRemoveTeam: () => void
  removeTeamIsPending: boolean

  pendingJornadaDelete: { jornadaId: string; numero: number } | null
  onConfirmDeleteJornada: () => void
  onCloseDeleteJornada: () => void
  deleteJornadaIsPending: boolean

  showDeletePlayoffsConfirm: boolean
  onConfirmDeletePlayoffs: () => void
  onCloseDeletePlayoffs: () => void
  deleteRondasIsPending: boolean

  showResetConfirm: boolean
  onConfirmReset: () => void
  onCloseReset: () => void
  resetDivisionIsPending: boolean

  showRemoveCampeonConfirm: boolean
  onConfirmRemoveCampeon: () => void
  onCloseRemoveCampeon: () => void
  removeCampeonIsPending: boolean

  isGeneratingJornada: boolean
  generateRondasIsPending: boolean
  assignCampeonIsPending: boolean
}

export default function DivisionConfirmDialogs({
  pendingTeamRemoval,
  onConfirmRemoveTeam,
  onCloseRemoveTeam,
  removeTeamIsPending,
  pendingJornadaDelete,
  onConfirmDeleteJornada,
  onCloseDeleteJornada,
  deleteJornadaIsPending,
  showDeletePlayoffsConfirm,
  onConfirmDeletePlayoffs,
  onCloseDeletePlayoffs,
  deleteRondasIsPending,
  showResetConfirm,
  onConfirmReset,
  onCloseReset,
  resetDivisionIsPending,
  showRemoveCampeonConfirm,
  onConfirmRemoveCampeon,
  onCloseRemoveCampeon,
  removeCampeonIsPending,
  isGeneratingJornada,
  generateRondasIsPending,
  assignCampeonIsPending,
}: Props) {
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 32 : 0)

  // Un solo overlay para todas: nunca corren dos a la vez, y repetir el bloque con distinto texto
  // invita a que se desincronicen.
  const busyLabel = isGeneratingJornada ? "Generando jornada..."
    : generateRondasIsPending ? "Generando eliminatorias..."
    : deleteRondasIsPending ? "Eliminando eliminatorias..."
    : resetDivisionIsPending ? "Reiniciando división..."
    : assignCampeonIsPending ? "Asignando campeón..."
    : removeCampeonIsPending ? "Quitando campeón..."
    : null

  return (
    <>
      <ConfirmationModal
        visible={pendingTeamRemoval !== null}
        title="Quitar equipo"
        message={pendingTeamRemoval ? `¿Quitar "${pendingTeamRemoval.nombre}" de la división?` : ""}
        highlightText={pendingTeamRemoval?.nombre}
        variant="danger"
        confirmLabel="Quitar"
        loading={removeTeamIsPending}
        onConfirm={onConfirmRemoveTeam}
        onClose={onCloseRemoveTeam}
      />
      <ConfirmationModal
        visible={pendingJornadaDelete !== null}
        title="Eliminar jornada"
        message={pendingJornadaDelete ? `¿Eliminar Jornada ${pendingJornadaDelete.numero} y sus partidos? Los resultados de eliminatoria se revertirán.` : ""}
        highlightText={pendingJornadaDelete ? `Jornada ${pendingJornadaDelete.numero}` : undefined}
        variant="danger"
        confirmLabel="Eliminar"
        loading={deleteJornadaIsPending}
        onConfirm={onConfirmDeleteJornada}
        onClose={onCloseDeleteJornada}
      />
      <ConfirmationModal
        visible={showDeletePlayoffsConfirm}
        title="Eliminar eliminatorias"
        message="¿Seguro? Se borrarán todas las rondas y partidos de eliminatoria. Esta acción no se puede deshacer."
        variant="danger"
        confirmLabel="Eliminar"
        onConfirm={onConfirmDeletePlayoffs}
        onClose={onCloseDeletePlayoffs}
      />
      <ConfirmationModal
        visible={showResetConfirm}
        title="Reiniciar división"
        message="¿Seguro? Se borrarán todas las jornadas, partidos, eliminatorias y estadísticas. Los equipos se conservan, el campeón pasa a Títulos anteriores y la división vuelve a quedar en curso."
        variant="danger"
        confirmLabel="Reiniciar"
        onConfirm={onConfirmReset}
        onClose={onCloseReset}
      />
      <ConfirmationModal
        visible={showRemoveCampeonConfirm}
        title="Quitar campeón"
        message="La división queda sin ganador. Puedes volver a asignarlo cuando quieras."
        variant="danger"
        confirmLabel="Quitar"
        onConfirm={onConfirmRemoveCampeon}
        onClose={onCloseRemoveCampeon}
      />
      <Modal visible={busyLabel !== null} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: Palette.overlay, justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: Palette.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 32,
            paddingTop: 48,
            paddingBottom: 48,
            marginBottom: bottomInset,
            alignItems: "center",
            gap: 16,
            borderTopWidth: 1,
            borderColor: Palette.border,
          }}>
            <ActivityIndicator size="large" color={Palette.cyan} />
            <Text style={{ color: Palette.cyan, fontSize: 18, fontWeight: "700" }}>{busyLabel}</Text>
          </View>
        </View>
      </Modal>
    </>
  )
}
