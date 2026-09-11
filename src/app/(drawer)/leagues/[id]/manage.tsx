import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { useIsFocused, useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette } from "@/constants/theme"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useDivisions, useDeleteDivision } from "@/features/division/hooks/useDivisions"
import { useLookups } from "@/features/league/hooks/useLookups"
import { useToast } from "@/shared/components/Toast"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { resolveNombre } from "@/shared/utils/resolve-lookup"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import LoadingScreen from "@/shared/components/LoadingScreen"
import { AuthGate } from "@/shared/components/AuthGate"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { useNavGuard } from "@/shared/hooks/useNavGuard"
import { isRateLimitError } from "@/infrastructure/api/rate-limit"

export default function ManageLeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const guard = useNavGuard()
  const isFocused = useIsFocused()
  const { data: league, isLoading, error: leagueError, refetch: refetchLeague } = useLeague(id!, isFocused)
  const lookups = useLookups({ categorias: isFocused, tipos: isFocused, estadosLiga: isFocused })
  const { data: divisions = [], error: divsError, refetch: refetchDivs } = useDivisions(id!, isFocused)
  const deleteDivision = useDeleteDivision(id!)
  const toast = useToast()
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchLeague(), refetchDivs()])
    } finally {
      setRefreshing(false)
    }
  }, [refetchLeague, refetchDivs])

  const handleDeleteDivision = (divisionId: string, nombre: string) => {
    setDeleteTarget({ id: divisionId, nombre })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const target = deleteTarget
    deleteDivision.mutate({ id: target.id, confirmName: target.nombre }, {
      onSuccess: () => {
        toast.success("División eliminada")
        setDeleteTarget(null)
      },
      onError: (e) => {
        toast.error(e.message || "Error al eliminar")
        if (!isRateLimitError(e)) setDeleteTarget(null)
      },
    })
  }

  if (isLoading || lookups.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (leagueError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" onBack={() => router.back()} />
        <ErrorState message={(leagueError as Error).message} onRetry={() => refetchLeague()} fullScreen />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Palette.text, fontSize: 16 }}>Liga no encontrada</Text>
      </View>
    )
  }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title={`Gestionar ${league.nombre}`} onBack={() => router.back()} />
        <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontWeight: "700" }}>Divisiones ({divisions.length})</Text>
              <TouchableOpacity onPress={() => guard(() => router.push({ pathname: "/(drawer)/leagues/[id]/division-form", params: { id: id! } }))}>
                <MaterialIcons name="add" size={22} color={Palette.cyan} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: Pad.base, gap: Gap.md }}>
              {divsError ? (
                <ErrorState message={(divsError as Error).message} onRetry={() => refetchDivs()} />
              ) : divisions.length === 0 ? (
                <EmptyState message="Esta liga no tiene divisiones" icon="category" />
              ) : (
                divisions.map((d) => (
                  <View key={d.id} style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.sm }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: Palette.text }}>{d.nombre}</Text>
                      <View style={{ flexDirection: "row", gap: Gap.sm }}>
                        <TouchableOpacity onPress={() => guard(() => router.push({ pathname: "/(drawer)/leagues/[id]/division-form", params: { id: id!, divisionId: d.id } }))}>
                          <MaterialIcons name="edit" size={20} color={Palette.cyan} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteDivision(d.id, d.nombre)}>
                          <MaterialIcons name="delete" size={20} color={Palette.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: Gap.sm, flexWrap: "wrap" }}>
                      <View style={{ backgroundColor: Palette.cyan20, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: Palette.cyan }}>{resolveNombre(lookups.estadosLiga, d.estadoLigaId)}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: Palette.textSecondary }}>{resolveNombre(lookups.categorias, d.categoriaId)} · {resolveNombre(lookups.tipos, d.tipoId)}</Text>
                      <Text style={{ fontSize: 13, color: Palette.textSecondary }}>Equipos: {d.maxEquipos}</Text>
                      <Text style={{ fontSize: 13, color: Palette.textSecondary }}>Arbitraje: ${d.arbitraje}</Text>
                    </View>
                    {(d.diasPartido || d.horarioPartido) ? (
                      <View style={{ flexDirection: "row", gap: Gap.sm, flexWrap: "wrap" }}>
                        {d.diasPartido ? <Text style={{ fontSize: 13, color: Palette.textSecondary }}>Días: {d.diasPartido}</Text> : null}
                        {d.horarioPartido ? <Text style={{ fontSize: 13, color: Palette.textSecondary }}>Horario: {d.horarioPartido}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
          </View>
        </PullToRefresh>
      </View>
      <ConfirmationModal
        visible={deleteTarget !== null}
        title="Eliminar división"
        message={`¿Eliminar "${deleteTarget?.nombre}"?`}
        highlightText={deleteTarget?.nombre}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteDivision.isPending}
        requireText={deleteTarget?.nombre}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AuthGate>
  )
}
