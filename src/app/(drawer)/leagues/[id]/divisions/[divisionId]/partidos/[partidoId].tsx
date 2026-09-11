import React, { useCallback } from "react"
import { View, Text, TouchableOpacity, RefreshControl, Share, ActivityIndicator } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useIsFocused, useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import { useToast } from "@/shared/components/Toast"
import { usePartido, useUpdatePartido, useUpdatePartidoResult, useCreateRefereeLink, useRevokeRefereeLink, useRefereeLinkStatus } from "@/features/partido/hooks/usePartidos"
import PartidoResultEditor from "@/features/jornada/components/PartidoResultEditor"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import { useDivisionEquipos } from "@/features/division-equipo/hooks/useDivisionEquipo"
import type { EquipoResponse } from "@/features/team/api/teams"
import { useQuery } from "@tanstack/react-query"
import { jornadaApi } from "@/features/jornada/api/jornadas"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useDivisionJugadores } from "@/features/jugador/hooks/useJugadores"
import { useDivision } from "@/features/division/hooks/useDivisions"
import { useElegibilidad } from "@/features/elegibilidad/hooks/useElegibilidad"
import { useLookups } from "@/features/league/hooks/useLookups"
import { codigoDeEstado } from "@/features/division/utils/estado-liga"
import { buildResultPayload, buildScorerCandidates, type ParticipacionInput, type ScorerAllocation, type ScorerCandidate } from "@/features/partido/scoring"

export default function PartidoDetailScreen() {
  const toast = useToast()
  const isFocused = useIsFocused()
  const { id, divisionId, partidoId } = useLocalSearchParams<{ id: string; divisionId: string; partidoId: string }>()
  const [refreshing, setRefreshing] = React.useState(false)
  const [refereeExpanded, setRefereeExpanded] = React.useState(false)
  const [replacementSide, setReplacementSide] = React.useState<"local" | "visitor" | null>(null)
  const [replacementTarget, setReplacementTarget] = React.useState<EquipoResponse | null>(null)
  const resultSubmissionRef = React.useRef(false)
  const replacementSubmissionRef = React.useRef(false)

  const { data: partido, isLoading, error, refetch } = usePartido(partidoId!)
  const canLoadReplacementData = isFocused && replacementSide !== null && partido?.estado === "PROGRAMADO" && !!partido.jornadaId && !partido.rondaPlayoffId && partido.tipoPartido === "REGULAR"
  const { data: league, isLoading: isLeagueLoading, error: leagueError, refetch: refetchLeague } = useLeague(id!)
  const { mutate: updatePartido, isPending: isUpdating } = useUpdatePartido()
  const updateResult = useUpdatePartidoResult()
  const createLink = useCreateRefereeLink()
  const revokeLink = useRevokeRefereeLink()
  const { data: linkStatus, isLoading: linkStatusLoading } = useRefereeLinkStatus(partidoId!, isFocused && refereeExpanded)
  const { data: divisionLinks = [], isLoading: replacementTeamsLoading } = useDivisionEquipos(divisionId!, canLoadReplacementData)
  const { data: jornada, isLoading: replacementJornadaLoading } = useQuery({ queryKey: ["jornada", partido?.jornadaId], queryFn: () => partido?.jornadaId ? jornadaApi.getById(partido.jornadaId) : Promise.reject(new Error("El partido no pertenece a una jornada")), enabled: canLoadReplacementData })
  const { data: localRoster = [] } = useDivisionJugadores(divisionId, partido?.equipoLocalId ?? undefined)
  const { data: visitorRoster = [] } = useDivisionJugadores(divisionId, partido?.equipoVisitanteId ?? undefined)
  const { data: division, isLoading: isDivisionLoading, error: divisionError, refetch: refetchDivision } = useDivision(divisionId!)
  // Solo hace falta en partidos del cuadro y cuando la división exige un mínimo: en cualquier
  // otro caso no hay nada que marcar y la consulta sobra.
  const exigeMinimo = (division?.minPartidosEliminatoria ?? 0) > 0 && division?.registrarParticipaciones === true
  const { data: elegibilidad } = useElegibilidad(divisionId, exigeMinimo && !!partido?.rondaPlayoffId)
  const partidosPorJugador = React.useMemo(
    () => Object.fromEntries((elegibilidad?.rows ?? []).map((fila) => [fila.jugadorId, fila.partidosJugados])),
    [elegibilidad],
  )
  const lookups = useLookups({ estadosLiga: true })
  const [cierreAvisoOpen, setCierreAvisoOpen] = React.useState(false)
  const [inelegiblesAviso, setInelegiblesAviso] = React.useState<{ mensaje: string; reintentar: () => void } | null>(null)
  // Una sola vez por pantalla: reguardar el mismo resultado no debe repetir el aviso.
  const cerroLaFinalRef = React.useRef(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
      await refetchDivision()
    } finally {
      setRefreshing(false)
    }
  }, [refetch, refetchDivision])

  const handleSave = (golesLocal: number, golesVisitante: number, estado: string, allocations: ScorerAllocation[], penalesLocal?: number, penalesVisitante?: number, _tipoPartido?: string, participaciones?: ParticipacionInput[], notas?: string | null, permitirInelegibles?: boolean) => {
    if (!partido || resultSubmissionRef.current) return
    resultSubmissionRef.current = true
    updateResult.mutate(
      { id: partido.id, divisionId, leagueId: id, previous: { estado: partido.estado, tipoPartido: partido.tipoPartido, jornadaId: partido.jornadaId, rondaPlayoffId: partido.rondaPlayoffId }, ...buildResultPayload({ expectedVersion: partido.version, golesLocal, golesVisitante, penalesLocal, penalesVisitante, estado, allocations, participaciones, notas }), ...(permitirInelegibles ? { permitirInelegibles: true } : {}) },
      {
        onSuccess: async () => {
          resultSubmissionRef.current = false
          toast.success("Resultado guardado")
          // El servidor cierra la división al guardarse el resultado de la final. No se puede
          // detectar con una bandera en la respuesta: `updateResult` va envuelto en
          // `withAmbiguousWriteRecovery`, y su camino de recuperación la reconstruye con
          // `getPartidoById`, que no la traería. La división sí es autoritativa.
          if (!partido.rondaPlayoffId || estado !== "FINALIZADO" || cerroLaFinalRef.current) return
          const { data: fresca } = await refetchDivision()
          if (codigoDeEstado(lookups.estadosLiga, fresca?.estadoLigaId) === "FINALIZADA") {
            cerroLaFinalRef.current = true
            setCierreAvisoOpen(true)
          }
        },
        onError: (e: any) => {
          resultSubmissionRef.current = false
          if (e?.response?.status === 409) { refetch(); toast.error("El partido cambió en otro dispositivo. Actualizamos los datos; revisa el resultado e inténtalo de nuevo."); return }
          // El mínimo de partidos para eliminatorias. Solo el dueño de la liga llega hasta acá
          // —el árbitro captura por otra ruta—, así que se le puede ofrecer la excepción.
          if (!permitirInelegibles && typeof e?.message === "string" && e.message.includes("partidos jugados para alinear")) {
            setInelegiblesAviso({ mensaje: e.message, reintentar: () => handleSave(golesLocal, golesVisitante, estado, allocations, penalesLocal, penalesVisitante, _tipoPartido, participaciones, notas, true) })
            return
          }
          toast.error(e.message)
        },
      },
    )
  }

  const handleShareReferee = () => {
    if (!partido) return
    createLink.mutate(partido.id, {
      onSuccess: (data) => {
        const shareText = `${partido?.equipoLocal?.nombre ?? "Local"} vs ${partido?.equipoVisitante?.nombre ?? "Visitante"} - Árbitro`
        Share.share({ message: `${shareText}\n\n${data.url}`, title: shareText })
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  const handleRevokeLink = () => {
    if (!partido) return
    revokeLink.mutate(partido.id, {
      onSuccess: () => {
        toast.success("Enlace revocado")
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  const closeReplacement = () => { setReplacementSide(null); setReplacementTarget(null) }
  const confirmReplacement = () => {
    if (!partido || !replacementSide || !replacementTarget || replacementSubmissionRef.current) return
    replacementSubmissionRef.current = true
    const field = replacementSide === "local" ? { equipoLocalId: replacementTarget.id } : { equipoVisitanteId: replacementTarget.id }
    updatePartido({ id: partido.id, divisionId, leagueId: id, previous: { estado: partido.estado, tipoPartido: partido.tipoPartido, jornadaId: partido.jornadaId, rondaPlayoffId: partido.rondaPlayoffId }, ...field }, {
      onSuccess: (updated) => { replacementSubmissionRef.current = false; closeReplacement(); const count = updated.jornadasRecalculadas ?? 0; toast.success(count ? `Equipos intercambiados y ${count} jornada(s) futura(s) recalculada(s)` : "Equipos intercambiados") },
      onError: (error) => { replacementSubmissionRef.current = false; toast.error(error.message) },
    })
  }

  if (isLoading || isLeagueLoading || isDivisionLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    )
  }

  if (error || leagueError || divisionError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" onBack={() => router.back()} />
        <ErrorState message={((error ?? leagueError ?? divisionError) as Error).message} onRetry={() => { refetch(); refetchLeague(); refetchDivision() }} fullScreen />
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

  const linkExpiresAt = linkStatus?.expiresAt ?? null
  const linkExists = linkStatus?.exists === true
  const linkStatusKnown = linkStatus !== undefined
  const divisionTeams = divisionLinks.map((link) => link.equipo).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const currentTeam = replacementSide === "local" ? partido.equipoLocal : partido.equipoVisitante
  const rivalId = replacementSide === "local" ? partido.equipoVisitanteId : partido.equipoLocalId
  const swappableTeamCounts = (jornada?.partidos ?? []).filter((item) => item.id !== partido.id && item.estado === "PROGRAMADO" && item.tipoPartido === "REGULAR").reduce<Record<string, number>>((counts, item) => { if (item.equipoLocalId) counts[item.equipoLocalId] = (counts[item.equipoLocalId] ?? 0) + 1; if (item.equipoVisitanteId) counts[item.equipoVisitanteId] = (counts[item.equipoVisitanteId] ?? 0) + 1; return counts }, {})
  const replacementOptions = divisionTeams.filter((team) => team.id !== rivalId && team.id !== currentTeam?.id && swappableTeamCounts[team.id] === 1)
  const canReplaceTeams = partido.estado === "PROGRAMADO" && !!partido.jornadaId && !partido.rondaPlayoffId && partido.tipoPartido === "REGULAR"
  const replacementDataLoading = replacementTeamsLoading || replacementJornadaLoading
  const rosterCandidates = (roster: typeof localRoster, side: "LOCAL" | "VISITANTE") => (records: { ladoMarcador: "LOCAL" | "VISITANTE"; jugadorId: string | null; jugadorNombre?: string | null; dorsal?: number | null }[]): ScorerCandidate[] =>
    buildScorerCandidates(
      roster.map((link) => ({ id: link.jugador.id, nombre: link.jugador.nombre, foto: link.jugador.foto, dorsal: link.dorsal })),
      records,
      side,
    )
  const localScorers = rosterCandidates(localRoster, "LOCAL")(partido.anotaciones ?? [])
  const visitorScorers = rosterCandidates(visitorRoster, "VISITANTE")(partido.anotaciones ?? [])
  const participantRecords = [...(partido.participaciones ?? []), ...(partido.anotaciones ?? [])]
  const localParticipants = rosterCandidates(localRoster, "LOCAL")(participantRecords)
  const visitorParticipants = rosterCandidates(visitorRoster, "VISITANTE")(participantRecords)

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Partido" onBack={() => router.back()} />
        <KeyboardAwareScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.cyan} colors={[Palette.cyan]} progressBackgroundColor={Palette.dark} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: Gap.lg, padding: Pad.base, paddingBottom: 48 }}
        >
          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.lg }}>
            <PartidoResultEditor partido={partido} isUpdating={updateResult.isPending} registrarParticipaciones={division?.registrarParticipaciones === true} registrarGoleo={division?.registrarGoleo !== false} usarPenalesEnEmpates={division?.usarPenalesEnEmpates !== false} onSave={handleSave} canReplaceTeams={canReplaceTeams} onReplaceTeam={setReplacementSide} multiplesCanchas={league?.multiplesCanchas === true} localPlayers={localScorers} visitorPlayers={visitorScorers} localParticipantPlayers={localParticipants} visitorParticipantPlayers={visitorParticipants} partidosPorJugador={partidosPorJugador} minimoEliminatoria={elegibilidad?.minimo ?? 0} />
          </View>

          <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: refereeExpanded ? Palette.cyan : Palette.border, overflow: "hidden" }}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: refereeExpanded }}
              accessibilityLabel={`Acceso del árbitro, ${!linkStatusKnown ? "estado sin consultar" : linkExists ? "enlace activo" : "sin enlace"}`}
              onPress={() => setRefereeExpanded((expanded) => !expanded)}
              style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, padding: Pad.base }}
            >
              <View style={{ width: 40, height: 40, borderRadius: Radius.lg, backgroundColor: linkExists ? Palette.success10 : Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="sports" size={21} color={linkExists ? Palette.success : Palette.cyan} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Acceso del árbitro</Text>
                <Text style={{ color: linkExists ? Palette.success : Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>
                  {linkStatusLoading ? "Consultando enlace..." : !linkStatusKnown ? "Consulta el estado al abrir" : linkExists ? "Enlace activo" : "Sin enlace compartido"}
                </Text>
              </View>
              {linkStatusLoading ? (
                <ActivityIndicator size="small" color={Palette.cyan} />
              ) : (
                <MaterialIcons name={refereeExpanded ? "expand-less" : "expand-more"} size={24} color={refereeExpanded ? Palette.cyan : Palette.textMuted} />
              )}
            </TouchableOpacity>

            {refereeExpanded ? (
              <View style={{ borderTopWidth: 1, borderTopColor: Palette.border, padding: Pad.base, gap: Gap.md }}>
                <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, lineHeight: 18 }}>
                  Comparte un enlace de un solo uso para que el árbitro registre el resultado sin iniciar sesión.
                </Text>
                {linkExists && linkExpiresAt ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.success10, borderRadius: Radius.md, padding: Pad.md }}>
                    <MaterialIcons name="schedule" size={17} color={Palette.success} />
                    <Text style={{ flex: 1, color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans }}>
                      Disponible hasta {new Date(linkExpiresAt).toLocaleString("es-MX")}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", gap: Gap.sm }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleShareReferee}
                    disabled={createLink.isPending || linkStatusLoading}
                    style={{ flex: 1, backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm, opacity: createLink.isPending || linkStatusLoading ? 0.6 : 1 }}
                  >
                    {createLink.isPending ? (
                      <ActivityIndicator size="small" color={Palette.dark} />
                    ) : (
                      <MaterialIcons name="share" size={19} color={Palette.dark} />
                    )}
                    <Text style={{ color: Palette.dark, fontSize: 14, fontFamily: Fonts.semiBold }}>{linkExists ? "Compartir" : "Crear y compartir"}</Text>
                  </TouchableOpacity>
                  {linkExists ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityLabel="Revocar enlace del árbitro"
                      onPress={handleRevokeLink}
                      disabled={revokeLink.isPending}
                      style={{ width: 48, borderRadius: Radius.md, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, alignItems: "center", justifyContent: "center", opacity: revokeLink.isPending ? 0.6 : 1 }}
                    >
                      {revokeLink.isPending ? (
                        <ActivityIndicator size="small" color={Palette.danger} />
                      ) : (
                        <MaterialIcons name="link-off" size={20} color={Palette.danger} />
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </KeyboardAwareScrollView>
        <AppBottomSheetModal visible={replacementSide !== null && replacementTarget === null} onClose={closeReplacement} title={replacementSide === "local" ? "Cambiar equipo local" : "Cambiar equipo visitante"} snapPoints={["65%"]}>
          <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans }}>Selecciona otro equipo con partido programado en esta jornada. Ambos intercambiarán su lugar.</Text>
          {replacementDataLoading ? <ActivityIndicator color={Palette.cyan} /> : replacementOptions.map((team) => <TouchableOpacity key={team.id} onPress={() => setReplacementTarget(team)} style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.md }}><LogoImage uri={team.logo} size={38} backgroundColor={Palette.surface} iconFallback="shield" /><Text style={{ color: Palette.text, fontFamily: Fonts.medium, flex: 1 }}>{team.nombre}</Text><MaterialIcons name="swap-horiz" size={22} color={Palette.cyan} /></TouchableOpacity>)}
          {!replacementDataLoading && !replacementOptions.length ? <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, textAlign: "center" }}>No hay otro equipo con un partido programado disponible para intercambiar.</Text> : null}
        </AppBottomSheetModal>
        {/* El cierre lo hizo el servidor al guardarse la final. El aviso solo informa y ofrece
            volver: el banner de la pantalla de división es el que lleva al selector, y así cubre
            también el caso de que la final la haya cerrado un árbitro. */}
        <ConfirmationModal
          visible={cierreAvisoOpen}
          title="Terminó el torneo"
          message="Se cerró la final, así que la división pasó a Finalizada y quedó de solo lectura. Falta asignar al campeón."
          confirmLabel="Ir a la división"
          cancelLabel="Después"
          variant="warning"
          onConfirm={() => { setCierreAvisoOpen(false); router.back() }}
          onClose={() => setCierreAvisoOpen(false)}
        />

        <ConfirmationModal
          visible={inelegiblesAviso !== null}
          title="Jugadores sin el mínimo de partidos"
          message={inelegiblesAviso?.mensaje ?? ""}
          confirmLabel="Autorizar y guardar"
          variant="warning"
          loading={isUpdating}
          onConfirm={() => { const reintentar = inelegiblesAviso?.reintentar; setInelegiblesAviso(null); reintentar?.() }}
          onClose={() => setInelegiblesAviso(null)}
        />
        <ConfirmationModal visible={replacementTarget !== null} title="Intercambiar equipos" message={`${currentTeam?.nombre ?? "El equipo actual"} y ${replacementTarget?.nombre ?? "el equipo seleccionado"} intercambiarán sus lugares. También se recalcularán los enfrentamientos regulares de las jornadas futuras para conservar el round-robin.`} highlightText={replacementTarget?.nombre} confirmLabel="Intercambiar" variant="warning" loading={isUpdating} onConfirm={confirmReplacement} onClose={closeReplacement} />
      </View>
    </AuthGate>
  )
}
