import { useMemo, useState } from "react"
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import type { Jugador } from "@/domain/interfaces/player"
import { POSICIONES_JUGADOR } from "@/domain/interfaces/player"
import { divisionApi } from "@/features/division/api/divisions"
import { useAssignJugadorToDivision, useDivisionJugadores, useJugadores, useRemoveJugadorFromDivision } from "@/features/jugador/hooks/useJugadores"
import { useTeam } from "@/features/team/hooks/useTeams"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import CustomHeader from "@/shared/components/CustomHeader"
import EmptyState from "@/shared/components/EmptyState"
import ErrorState from "@/shared/components/ErrorState"
import LoadingScreen from "@/shared/components/LoadingScreen"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { useToast } from "@/shared/components/Toast"

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((item) => item.id === posicion)?.nombre ?? posicion
}

export default function DivisionTeamPlayersScreen() {
  const toast = useToast()
  const { divisionId, teamId } = useLocalSearchParams<{ divisionId: string; teamId: string }>()
  const { data: team, isLoading: loadingTeam, error: teamError, refetch: refetchTeam } = useTeam(teamId)
  const { data: division, isLoading: loadingDivision, error: divisionError, refetch: refetchDivision } = useQuery({
    queryKey: ["division", divisionId],
    queryFn: () => divisionApi.getById(divisionId!),
    enabled: !!divisionId,
  })
  const { data: plantilla = [], isLoading: loadingPlantilla, refetch: refetchPlantilla } = useJugadores(teamId)
  const { data: habilitados = [], isLoading: loadingHabilitados, refetch: refetchHabilitados } = useDivisionJugadores(divisionId, teamId)
  const assign = useAssignJugadorToDivision()
  const remove = useRemoveJugadorFromDivision()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loadingPlayerId, setLoadingPlayerId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const enabledIds = useMemo(() => new Set(habilitados.map((row) => row.jugadorId)), [habilitados])
  const availablePlayers = useMemo(() => plantilla.filter((jugador) => !enabledIds.has(jugador.id)), [enabledIds, plantilla])

  const dorsalFor = (jugador: Jugador) => jugador.equipos?.find((membership) => membership.equipoId === teamId)?.dorsal

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchTeam(), refetchDivision(), refetchPlantilla(), refetchHabilitados()])
    } finally {
      setRefreshing(false)
    }
  }

  const handleAssign = async (jugadorId: string) => {
    if (!divisionId || !teamId) return
    setLoadingPlayerId(jugadorId)
    try {
      await assign.mutateAsync({ divisionId, equipoId: teamId, jugadorId })
      toast.success("Jugador habilitado en la división")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo habilitar al jugador")
    } finally {
      setLoadingPlayerId(null)
    }
  }

  const handleRemove = async (jugadorId: string) => {
    if (!divisionId || !teamId) return
    setLoadingPlayerId(jugadorId)
    try {
      await remove.mutateAsync({ divisionId, equipoId: teamId, jugadorId })
      toast.success("Jugador retirado de la división")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo retirar al jugador")
    } finally {
      setLoadingPlayerId(null)
    }
  }

  if (loadingTeam || loadingDivision) return <LoadingScreen />

  const error = teamError || divisionError
  if (error || !team || !division) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Jugadores" />
        <ErrorState message={error ? (error as Error).message : "No se encontró el equipo o la división"} onRetry={handleRefresh} fullScreen />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Jugadores división" />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, paddingBottom: 48, gap: Gap.lg }}>
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.sm }}>
            <Text style={{ color: Palette.text, fontFamily: Fonts.displayBold, fontSize: 20 }}>{team.nombre}</Text>
            <Text style={{ color: Palette.textMuted, fontSize: 13 }}>{division.nombre} · {division.liga?.nombre ?? "Liga"}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Gap.md }}>
            <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Habilitados ({habilitados.length})
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Agregar jugador a la división"
              onPress={() => setPickerOpen(true)}
              style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingHorizontal: Pad.md }}
            >
              <MaterialIcons name="person-add" size={18} color={Palette.black} />
              <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold, fontSize: 12 }}>Agregar jugador</Text>
            </TouchableOpacity>
          </View>

          {loadingPlantilla || loadingHabilitados ? (
            <ActivityIndicator color={Palette.cyan} />
          ) : habilitados.length === 0 ? (
            <EmptyState message="No hay jugadores habilitados en esta división" icon="groups" />
          ) : (
            <View style={{ gap: Gap.sm }}>
              {habilitados.map((row) => {
                const jugador = row.jugador
                const isPending = loadingPlayerId === jugador.id
                return (
                  <View key={row.jugadorId} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm, opacity: isPending ? 0.55 : 1 }}>
                    <Image source={jugador.foto ? { uri: jugador.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 48, height: 48, borderRadius: Radius.full }} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>{jugador.nombre}</Text>
                      <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(jugador.posicion)} · #{row.dorsal}</Text>
                    </View>
                    <TouchableOpacity disabled={isPending} accessibilityRole="button" accessibilityLabel={`Retirar a ${jugador.nombre} de la división`} onPress={() => handleRemove(jugador.id)} style={{ padding: Pad.sm }}>
                      {isPending ? <ActivityIndicator size="small" color={Palette.danger} /> : <MaterialIcons name="remove-circle-outline" size={22} color={Palette.danger} />}
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </PullToRefresh>

      <AppBottomSheetModal visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Agregar jugador" snapPoints={["75%"]}>
        {loadingPlantilla || loadingHabilitados ? (
          <ActivityIndicator color={Palette.cyan} />
        ) : availablePlayers.length === 0 ? (
          <Text style={{ color: Palette.textMuted, fontSize: 13 }}>Todos los jugadores del equipo ya están habilitados en esta división.</Text>
        ) : (
          <View style={{ gap: Gap.sm }}>
            {availablePlayers.map((jugador) => {
              const isPending = loadingPlayerId === jugador.id
              return (
                <TouchableOpacity key={jugador.id} disabled={isPending} onPress={() => handleAssign(jugador.id)} activeOpacity={0.75} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.sm, opacity: isPending ? 0.55 : 1 }}>
                  <Image source={jugador.foto ? { uri: jugador.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 40, height: 40, borderRadius: Radius.full }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>{jugador.nombre}</Text>
                    <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{formatPosicion(jugador.posicion)} · #{dorsalFor(jugador) ?? "-"}</Text>
                  </View>
                  {isPending ? <ActivityIndicator size="small" color={Palette.cyan} /> : <MaterialIcons name="add-circle-outline" size={22} color={Palette.cyan} />}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
        <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ minHeight: 48, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: Palette.danger, fontFamily: Fonts.medium }}>Cerrar</Text>
        </TouchableOpacity>
      </AppBottomSheetModal>
    </View>
  )
}
