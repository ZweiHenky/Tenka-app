import { useCallback, useState } from "react"
import { Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Fonts, Gap, Pad, Palette } from "@/constants/theme"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { usePartido } from "@/features/partido/hooks/usePartidos"
import PublicMatchScoreCard from "@/features/partido/components/PublicMatchScoreCard"
import MatchScorers from "@/features/partido/components/MatchScorers"
import MatchLineups from "@/features/partido/components/MatchLineups"

export default function PublicPartidoDetailScreen() {
  const { partidoId } = useLocalSearchParams<{ partidoId: string }>()
  const [refreshing, setRefreshing] = useState(false)
  const { data: partido, isLoading, error, refetch } = usePartido(partidoId ?? "")

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }, [refetch])

  if (isLoading) return <View style={{ flex: 1, backgroundColor: Palette.black }}><CustomHeader title="Partido" onBack={() => router.back()} /><LoadingScreen /></View>
  if (error) return <View style={{ flex: 1, backgroundColor: Palette.black }}><CustomHeader title="Partido" onBack={() => router.back()} /><ErrorState message={error.message} onRetry={() => refetch()} fullScreen /></View>
  if (!partido) return <View style={{ flex: 1, backgroundColor: Palette.black }}><CustomHeader title="Partido" onBack={() => router.back()} /><View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Text style={{ color: Palette.text, fontFamily: Fonts.sans }}>Partido no encontrado</Text></View></View>

  const goToPlayer = (playerId: string) => router.push(`/(drawer)/(public)/jugador/${playerId}`)
  const localName = partido.equipoLocal?.nombre ?? "Local"
  const visitorName = partido.equipoVisitante?.nombre ?? "Visitante"

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Detalle del partido" onBack={() => router.back()} />
      <PullToRefresh refreshing={refreshing} onRefresh={refresh}>
        <View style={{ padding: Pad.base, paddingBottom: 48, gap: Gap.lg }}>
          <PublicMatchScoreCard partido={partido} timeZone={partido.timeZone ?? "America/Mexico_City"} />
          <MatchScorers localName={localName} visitorName={visitorName} localScore={partido.golesLocal} visitorScore={partido.golesVisitante} annotations={partido.anotaciones ?? []} onPlayerPress={goToPlayer} />
          <MatchLineups localName={localName} visitorName={visitorName} participations={partido.participaciones ?? []} onPlayerPress={goToPlayer} />
        </View>
      </PullToRefresh>
    </View>
  )
}
