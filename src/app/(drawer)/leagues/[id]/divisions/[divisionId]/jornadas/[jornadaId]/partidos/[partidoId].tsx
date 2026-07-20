import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, RefreshControl, Share, ActivityIndicator } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useToast } from "@/shared/components/Toast"
import { usePartido, useUpdatePartido, useCreateRefereeLink, useRevokeRefereeLink } from "@/features/partido/hooks/usePartidos"
import PartidoResultEditor from "@/features/jornada/components/PartidoResultEditor"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"

export default function PartidoDetailScreen() {
  const toast = useToast()
  const { divisionId, partidoId } = useLocalSearchParams<{ divisionId: string; partidoId: string }>()
  const [refreshing, setRefreshing] = useState(false)
  const [refereeUrl, setRefereeUrl] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)

  const { data: partido, isLoading, error, refetch } = usePartido(partidoId!)
  const { mutate: updatePartido, isPending: isUpdating } = useUpdatePartido()
  const createLink = useCreateRefereeLink()
  const revokeLink = useRevokeRefereeLink()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleSave = (golesLocal: number, golesVisitante: number, estado: string, penalesLocal?: number, penalesVisitante?: number, tipoPartido?: string) => {
    if (!partido) return
    updatePartido(
      { id: partido.id, golesLocal, golesVisitante, penalesLocal, penalesVisitante, estado, divisionId, tipoPartido },
      { onSuccess: () => { toast.success("Resultado guardado") }, onError: (e) => { toast.error(e.message) } },
    )
  }

  const handleShareReferee = async () => {
    if (!partido) return
    setGeneratingLink(true)
    createLink.mutate(partido.id, {
      onSuccess: (data) => {
        setRefereeUrl(data.url)
        setGeneratingLink(false)
        Share.share({ message: data.url, title: `Árbitro - ${partido?.equipoLocal?.nombre ?? "Local"} vs ${partido?.equipoVisitante?.nombre ?? "Visitante"}` })
      },
      onError: (e) => {
        setGeneratingLink(false)
        toast.error(e.message)
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

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" onBack={() => router.back()} />
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} fullScreen />
      </View>
    )
  }

  if (!partido) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Partido" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: Palette.text, fontSize: 16 }}>Partido no encontrado</Text>
        </View>
      </View>
    )
  }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Resultado" onBack={() => router.back()} />
        <KeyboardAwareScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.cyan} colors={[Palette.cyan]} progressBackgroundColor={Palette.dark} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: Gap.md, padding: Pad.base, paddingBottom: 48 }}
        >
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1, borderColor: Palette.border, padding: Pad.base }}>
            <PartidoResultEditor partido={partido} isUpdating={isUpdating} onSave={handleSave} />
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShareReferee}
            disabled={generatingLink || createLink.isPending}
            style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm, opacity: generatingLink || createLink.isPending ? 0.6 : 1 }}
          >
            {generatingLink || createLink.isPending ? (
              <ActivityIndicator size="small" color={Palette.dark} />
            ) : (
              <MaterialIcons name="share" size={20} color={Palette.dark} />
            )}
            <Text style={{ color: Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>Compartir con árbitro</Text>
          </TouchableOpacity>

          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.md, padding: Pad.base, gap: Gap.sm, borderWidth: 1, borderColor: Palette.border }}>
            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <Text style={{ color: Palette.cyan, fontSize: 11, fontFamily: Fonts.medium }}>•</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.medium, flex: 1 }}>Finalizar: asigna el resultado final a la tabla de posiciones</Text>
            </View>
            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <Text style={{ color: Palette.danger, fontSize: 11, fontFamily: Fonts.medium }}>•</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.medium, flex: 1 }}>Suspender: el partido no cuenta para la tabla</Text>
            </View>
            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <Text style={{ color: Palette.warning, fontSize: 11, fontFamily: Fonts.medium }}>•</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.medium, flex: 1 }}>Reabrir: regresa el partido a programado</Text>
            </View>
            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              <Text style={{ color: Palette.success, fontSize: 11, fontFamily: Fonts.medium }}>•</Text>
              <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.medium, flex: 1 }}>Penales: si hay empate, define al ganador (ganador 2 pts, perdedor 1 pt)</Text>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </AuthGate>
  )
}
