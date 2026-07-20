import { useState } from "react"
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { POSICIONES_JUGADOR } from "@/domain/interfaces/player"
import { useJugador } from "@/features/jugador/hooks/useJugadores"
import { jugadorApi } from "@/features/jugador/api/jugadores"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import PullToRefresh from "@/shared/components/PullToRefresh"

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((p) => p.id === posicion)?.nombre ?? posicion
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: jugador, isLoading, error, refetch } = useJugador(id)
  const { data: divisiones = [], isLoading: loadingDivs } = useQuery({
    queryKey: ["jugador", "divisiones", id],
    queryFn: () => jugadorApi.listDivisionsByPlayer(id!),
    enabled: !!id,
  })
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetch()])
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error || !jugador) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Jugador" />
        <ErrorState message={error ? (error as Error).message : "Jugador no encontrado"} onRetry={() => refetch()} fullScreen />
      </View>
    )
  }

  const dorsal = jugador.equipos?.[0]?.dorsal

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="Detalle jugador" />
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.xl, alignItems: "center", gap: Gap.md }}>
            <View style={{ width: 104, height: 104, borderRadius: Radius.full, overflow: "hidden", borderWidth: 2, borderColor: Palette.cyan, backgroundColor: Palette.surfaceLight }}>
              <Image source={jugador.foto ? { uri: jugador.foto } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 104, height: 104 }} resizeMode="cover" />
            </View>
            <Text style={{ color: Palette.text, fontSize: 24, fontFamily: Fonts.displayBold, textAlign: "center" }}>{jugador.nombre}</Text>
            <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 14 }}>{formatPosicion(jugador.posicion)}{dorsal != null ? ` · #${dorsal}` : ""}</Text>
          </View>

          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
            <InfoRow icon="tag" label="Dorsal" value={dorsal != null ? `#${dorsal}` : "No asignado"} />
            <Divider />
            <InfoRow icon="sports-soccer" label="Posición" value={formatPosicion(jugador.posicion)} />
            <Divider />
            <InfoRow icon="cake" label="Edad" value={jugador.edad != null ? `${jugador.edad} años` : "No registrada"} muted={jugador.edad == null} />
            {jugador.telefono ? (
              <>
                <Divider />
                <InfoRow icon="phone" label="Teléfono" value={jugador.telefono} />
              </>
            ) : null}
          </View>

          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
            <Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 16 }}>Equipos</Text>
            {jugador.equipos && jugador.equipos.length > 0 ? (
              jugador.equipos.map((eq) => (
                <TouchableOpacity key={eq.equipoId} activeOpacity={0.8} onPress={() => router.push({ pathname: "/(drawer)/(public)/equipo/[id]", params: { id: eq.equipoId } })} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.sm }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: Palette.cyan, fontFamily: Fonts.displayBold, fontSize: 12 }}>{eq.dorsal}</Text>
                  </View>
                  <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, flex: 1 }}>{eq.equipo?.nombre ?? eq.equipoId}</Text>
                  <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: Palette.textMuted, fontSize: 13 }}>No está asignado a equipos.</Text>
            )}
          </View>

          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
            <Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 16 }}>Divisiones habilitadas</Text>
            {loadingDivs ? (
              <ActivityIndicator color={Palette.cyan} />
            ) : divisiones.length === 0 ? (
              <EmptyState message="No está habilitado en ninguna división" icon="emoji-events" />
            ) : (
              divisiones.map((dj) => (
                <TouchableOpacity key={`${dj.divisionId}-${dj.equipoId}`} activeOpacity={0.8} onPress={() => router.push({ pathname: "/(drawer)/(public)/equipo/[id]", params: { id: dj.equipoId } })} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.sm }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, overflow: "hidden", backgroundColor: Palette.cyan10 }}>
                    <Image source={dj.division.liga?.logo ? { uri: dj.division.liga.logo } : require("@/assets/ejemplos/logo.jpg")} style={{ width: 38, height: 38 }} resizeMode="cover" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }}>{dj.division.nombre}</Text>
                    <Text style={{ color: Palette.textMuted, fontSize: 12 }}>{dj.division.liga?.nombre ?? "Liga"} · {dj.equipo.nombre}</Text>
                  </View>
                  {dj.division.estadoLiga?.nombre ? (
                    <View style={{ backgroundColor: Palette.cyan10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
                      <Text style={{ color: Palette.cyan, fontSize: 11, fontFamily: Fonts.semiBold }}>{dj.division.estadoLiga.nombre}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </PullToRefresh>
    </View>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: Palette.border }} />
}

function InfoRow({ icon, label, value, muted }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={icon} size={17} color={Palette.cyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: muted ? Palette.textMuted : Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>{value}</Text>
      </View>
    </View>
  )
}
