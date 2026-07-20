import { useState, useCallback } from "react"
import { View, Text } from "react-native"
import { useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useLookups } from "@/features/league/hooks/useLookups"
import { useDivisions, useDeleteDivision } from "@/features/division/hooks/useDivisions"
import { useToast } from "@/shared/components/Toast"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import LeagueHeroCard from "@/features/league/components/LeagueHeroCard"
import DivisionListCard from "@/features/division/components/DivisionListCard"
import QrCard from "@/shared/components/QrCard"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import { TabBar } from "@/shared/components/TabBar"

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: league, isLoading, error: leagueError, refetch: refetchLeague } = useLeague(id!)
  const lookups = useLookups()
  const { data: divisions = [], error: divsError, refetch: refetchDivs } = useDivisions(id!)
  const deleteDivision = useDeleteDivision(id!)
  const toast = useToast()
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState("divisiones")
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
    deleteDivision.mutate(target.id, {
      onSuccess: () => {
        toast.success("División eliminada")
        setDeleteTarget(null)
      },
      onError: (e) => {
        toast.error(e.message || "Error al eliminar")
        setDeleteTarget(null)
      },
    })
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="" />
        <LoadingScreen />
      </View>
    )
  }

  if (leagueError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" />
        <ErrorState message={(leagueError as Error).message} onRetry={() => refetchLeague()} fullScreen />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, alignItems: "center" }}>
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.sans }}>Liga no encontrada</Text>
        </View>
      </View>
    )
  }

  const ubicacionTexto = league.ubicacion?.nombreCompleto ?? lookups.ubicaciones.find((u) => u.id === league.ubicacionId)?.nombreCompleto ?? "Ubicación no disponible"

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Detalle de Liga" />
        <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
            <LeagueHeroCard nombre={league.nombre} cancha={league.cancha} />

            <TabBar tabs={[{ key: "divisiones", label: "Divisiones" }, { key: "info", label: "Info" }]} activeTab={tab} onTabChange={setTab} />

            {tab === "divisiones" ? (
              divsError ? (
                <ErrorState message={(divsError as Error).message} onRetry={() => refetchDivs()} />
              ) : (
                <DivisionListCard
                  divisions={divisions}
                  onNavigate={(divisionId) => router.push(`/(drawer)/leagues/${id}/divisions/${divisionId}`)}
                  onEdit={(division) => router.push({ pathname: "/(drawer)/leagues/[id]/division-form", params: { id: id!, divisionId: division.id } })}
                  onDelete={handleDeleteDivision}
                  onAdd={() => router.push({ pathname: "/(drawer)/leagues/[id]/division-form", params: { id: id! } })}
                />
              )
            ) : null}

            {tab === "info" ? (
              <View style={{ gap: Gap.lg }}>
                <View style={{ gap: Gap.sm }}>
                  <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Sobre la liga</Text>
                  {league.descripcion ? (
                    <View style={{ flexDirection: "row", gap: Gap.sm, alignItems: "flex-start" }}>
                      <MaterialIcons name="description" size={18} color={Palette.cyan} style={{ marginTop: 2 }} />
                      <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans, lineHeight: 20, flex: 1 }}>{league.descripcion}</Text>
                    </View>
                  ) : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                    <MaterialIcons name="emoji-events" size={18} color={Palette.cyan} />
                    <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{divisions.length} divisiones creadas</Text>
                  </View>
                </View>
                <View style={{ gap: Gap.sm }}>
                  <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Ubicación</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                    <MaterialIcons name="location-on" size={18} color={Palette.cyan} />
                    <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{ubicacionTexto}</Text>
                  </View>
                </View>
                {(league as any).multiplesCanchas && (league as any).canchas?.length > 0 ? (
                  <View style={{ gap: Gap.sm }}>
                    <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Canchas</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
                      {(league as any).canchas.map((c: any) => (
                        <View key={c.id} style={{
                          backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border,
                          paddingHorizontal: Pad.md, paddingVertical: Pad.sm,
                        }}>
                          <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{c.nombre}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                <QrCard value={league.id} label="Código QR de la liga" hint="Comparte este código para que los equipos se unan" />
              </View>
            ) : null}
          </View>
        </PullToRefresh>
      </View>
      <ConfirmationModal
        visible={deleteTarget !== null}
        title="Eliminar división"
        message={`¿Estas seguro de eliminar la division: ${deleteTarget?.nombre}"?`}
        highlightText={deleteTarget?.nombre}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteDivision.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AuthGate>
  )
}
