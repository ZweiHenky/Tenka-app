import { useState, useMemo, useCallback } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"
import DayGroup from "@/features/jornada/components/DayGroup"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import { AuthGate } from "@/shared/components/AuthGate"
import CustomHeader from "@/shared/components/CustomHeader"
import PullToRefresh from "@/shared/components/PullToRefresh"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"
import { downloadPdf, programacionHtml } from "@/shared/utils/print-pdf"
import { useToast } from "@/shared/components/Toast"

function toDateKey(fechaStr: string): string {
  const d = new Date(fechaStr)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${year}-${month}-${day}`
}

export default function JornadaDetailScreen() {
  const toast = useToast()
  const { id, divisionId, jornadaId } = useLocalSearchParams<{ id: string; divisionId: string; jornadaId: string }>()
  const qc = useQueryClient()

  const { data: jornada, isLoading, error, refetch } = useQuery({
    queryKey: ["jornada", jornadaId],
    queryFn: () => jornadaApi.getById(jornadaId!),
    enabled: !!jornadaId,
  })

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["jornada", jornadaId] }),
        qc.invalidateQueries({ queryKey: ["jornadas-infinitas", jornada?.divisionId] }),
        qc.invalidateQueries({ queryKey: ["tabla-posiciones", jornada?.divisionId] }),
        qc.invalidateQueries({ queryKey: ["partidos-ronda"] }),
        qc.invalidateQueries({ queryKey: ["partidos-ultima-ronda"] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, jornadaId, jornada?.divisionId])

  const groupedByDay = useMemo(() => {
    if (!jornada?.partidos) return []
    const groups: Record<string, typeof jornada.partidos> = {}
    for (const p of jornada.partidos) {
      const key = p.fecha ? toDateKey(p.fecha) : "sin-fecha"
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "sin-fecha") return 1
      if (b === "sin-fecha") return -1
      return a.localeCompare(b)
    })
  }, [jornada])

  const handlePartidoPress = (partido: PartidoResponse) => {
    router.push(`/leagues/${id}/divisions/${divisionId}/jornadas/${jornadaId}/partidos/${partido.id}`)
  }

  const handleDownloadPdf = async () => {
    if (!jornada?.partidos || jornada.partidos.length === 0) {
      toast.info("No hay partidos para descargar")
      return
    }
    try {
      const partidos = jornada.partidos.map((p) => {
        const d = p.fecha ? new Date(p.fecha) : null
        const fecha = d && !isNaN(d.getTime())
          ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
          : "—"
        const hora = d && !isNaN(d.getTime())
          ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
          : "—"
        return {
          fecha,
          hora,
          cancha: p.cancha?.nombre ?? "—",
          local: p.equipoLocal?.nombre ?? "—",
          visitante: p.equipoVisitante?.nombre ?? "—",
        }
      })
      const html = programacionHtml("", jornada.numero, partidos)
      await downloadPdf(html, `Jornada-${jornada.numero}.pdf`)
    } catch {
      toast.error("Error al generar PDF")
    }
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
        <CustomHeader title="Error" />
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} fullScreen />
      </View>
    )
  }

  if (!jornada) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Palette.text, fontSize: 16 }}>Jornada no encontrada</Text>
      </View>
    )
  }

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title={`Jornada ${jornada.numero}`} />
        <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
          <View style={{ padding: Pad.base, gap: Gap.md, paddingBottom: 48 }}>
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Pad.base, paddingVertical: Pad.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <MaterialIcons name="calendar-month" size={22} color={Palette.cyan} />
              <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.display }}>Jornada {jornada.numero}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              {jornada.partidos ? <Text style={{ color: Palette.textMuted, fontSize: 13 }}>{jornada.partidos.length} partidos</Text> : null}
              {jornada.partidos && jornada.partidos.length > 0 ? (
                <TouchableOpacity onPress={handleDownloadPdf} style={{ width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Palette.cyan20, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="picture-as-pdf" size={18} color={Palette.cyan} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View style={{ paddingHorizontal: Pad.base, paddingBottom: Pad.base, gap: Gap.md }}>
            {groupedByDay.length > 0 ? (
              groupedByDay.map(([dateKey, dayPartidos]) => (
                <DayGroup key={dateKey} dateKey={dateKey} partidos={dayPartidos} onPartidoPress={handlePartidoPress} />
              ))
            ) : (
              <EmptyState message="No hay partidos en esta jornada" icon="sports-soccer" />
            )}
          </View>
        </View>
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
          </View>
        </PullToRefresh>
      </View>

    </AuthGate>
  )
}
