import { useState, useMemo, useCallback } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useRondasPlayoff } from "@/features/ronda-playoff/hooks/useRondasPlayoff"
import { partidoApi } from "@/features/partido/api/partidos"
import { useUpdatePartido } from "@/features/partido/hooks/usePartidos"
import PartidoCard from "@/features/jornada/components/PartidoCard"
import ScoreModal from "@/features/jornada/components/ScoreModal"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import CustomHeader from "@/shared/components/CustomHeader"
import { useToast } from "@/shared/components/Toast"
import { AuthGate } from "@/shared/components/AuthGate"
import PullToRefresh from "@/shared/components/PullToRefresh"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"

export default function EliminatoriasScreen() {
  const toast = useToast()
  const { divisionId, rondaId } = useLocalSearchParams<{ divisionId: string; rondaId?: string }>()
  const qc = useQueryClient()
  const { data: rondas = [], isLoading: loadRondas, error: rondasError, refetch: refetchRondas } = useRondasPlayoff(divisionId!)
  const { mutate: updatePartido, isPending: isUpdating } = useUpdatePartido()
  const [selectedPartido, setSelectedPartido] = useState<PartidoResponse | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["rondas-playoff", divisionId] }),
        qc.invalidateQueries({ queryKey: ["partidos-ronda"] }),
        qc.invalidateQueries({ queryKey: ["partidos-ultima-ronda"] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, divisionId])

  const visibleRondas = useMemo(() => {
    if (rondaId) return rondas.filter((r) => r.id === rondaId)
    return rondas
  }, [rondas, rondaId])

  const headerTitle = useMemo(() => {
    if (rondaId) {
      const ronda = rondas.find((r) => r.id === rondaId)
      return ronda?.nombre ?? "Eliminatorias"
    }
    return "Eliminatorias"
  }, [rondas, rondaId])

  const rondaQueries = useQuery({
    queryKey: ["partidos-ronda", rondas.map((r) => r.id)],
    queryFn: async () => {
      const results = await Promise.all(
        rondas.map(async (ronda) => {
          const partidos = await partidoApi.findByRondaPlayoff(ronda.id)
          return { rondaId: ronda.id, partidos }
        }),
      )
      return results
    },
    enabled: rondas.length > 0,
  })

  const partidosPorRonda = useMemo(() => {
    if (!rondaQueries.data) return new Map<string, PartidoResponse[]>()
    const map = new Map<string, PartidoResponse[]>()
    for (const { rondaId, partidos } of rondaQueries.data) {
      map.set(rondaId, partidos)
    }
    return map
  }, [rondaQueries.data])

  const handleSave = (golesLocal: number, golesVisitante: number, estado: string, penalesLocal?: number, penalesVisitante?: number) => {
    if (!selectedPartido) return
    updatePartido(
      { id: selectedPartido.id, golesLocal, golesVisitante, penalesLocal, penalesVisitante, estado, divisionId },
      { onSuccess: () => { setSelectedPartido(null); toast.success("Resultado guardado") } },
    )
  }

  if (loadRondas) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Eliminatorias" />
        <LoadingScreen />
      </View>
    )
  }

  if (rondasError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Eliminatorias" />
        <ErrorState message={(rondasError as Error).message} onRetry={() => refetchRondas()} fullScreen />
      </View>
    )
  }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title={headerTitle} />
        <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ padding: Pad.base, gap: Gap.md, paddingBottom: 48 }}>
          {visibleRondas.map((ronda) => {
          const partidos = partidosPorRonda.get(ronda.id) ?? []
          return (
            <View key={ronda.id} style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: Gap.sm,
                paddingHorizontal: Pad.base, paddingVertical: Pad.md,
                backgroundColor: Palette.cyan,
              }}>
                <MaterialIcons name="emoji-events" size={18} color={Palette.black} />
                <Text style={{ fontSize: 15, fontFamily: Fonts.display, color: Palette.black }}>{ronda.nombre}</Text>
              </View>
              <View style={{ padding: Pad.base, gap: Gap.sm }}>
                {rondaQueries.isLoading ? (
                  <ActivityIndicator size="small" color={Palette.cyan} />
                ) : partidos.length === 0 ? (
                  <EmptyState message="Sin partidos" icon="sports-soccer" />
                ) : (
                  partidos.map((p) => (
                    <PartidoCard key={p.id} partido={p} onPress={setSelectedPartido} />
                  ))
                )}
              </View>
            </View>
          )
          })}
          </View>
        </PullToRefresh>
      </View>

      <ScoreModal
        partido={selectedPartido}
        visible={!!selectedPartido}
        isUpdating={isUpdating}
        onSave={handleSave}
        onClose={() => setSelectedPartido(null)}
      />
    </AuthGate>
  )
}
