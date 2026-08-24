import { useEffect, useMemo, useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import * as Linking from "expo-linking"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useToast } from "@/shared/components/Toast"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import LoadingScreen from "@/shared/components/LoadingScreen"
import LogoImage from "@/shared/components/LogoImage"
import { refereeApiClient, type RefereePartidoResponse } from "@/features/partido/api/partidos"
import { getPlayoffFinalizationError } from "@/shared/utils/playoff-finalization"
import ScorerAllocationEditor from "@/features/partido/components/ScorerAllocationEditor"
import { allocationsFromAnnotations, buildResultPayload, buildScorerCandidates, hasValidAllocations, hayGoleadoresCapturados, participacionesFromResponse, type ParticipacionInput, type ScorerAllocation } from "@/features/partido/scoring"
import ParticipacionEditor from "@/features/partido/components/ParticipacionEditor"
import { getRetryAfterSeconds, isRateLimitError } from "@/infrastructure/api/rate-limit"

const TIPO_INFO = {
  REGULAR: { label: "Regular", color: Palette.cyan, background: Palette.cyan10 },
  AMISTOSO: { label: "Amistoso", color: Palette.success, background: Palette.success10 },
  COMPLEMENTO: { label: "Completar", color: Palette.warning, background: Palette.warning10 },
  ELIMINATORIA: { label: "Eliminatoria", color: Palette.playoff, background: Palette.playoff10 },
} as const

function parseTokenFromUrl(url: string | null): string | null {
  if (!url) return null
  const fragment = url.split("#")[1]
  if (!fragment) return null
  const params = new URLSearchParams(fragment)
  return params.get("token")
}

export default function ArbitroScreen() {
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const deepLink = Linking.useLinkingURL()
  const urlReady = deepLink !== null
  const token = useMemo(() => deepLink ? parseTokenFromUrl(deepLink) : null, [deepLink])
  const client = useMemo(() => token ? refereeApiClient(token) : null, [token])

  const [partido, setPartido] = useState<RefereePartidoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [submitRetryCountdown, setSubmitRetryCountdown] = useState(0)
  const [golesLocal, setGolesLocal] = useState("")
  const [golesVisitante, setGolesVisitante] = useState("")
  const [penalesLocal, setPenalesLocal] = useState("")
  const [penalesVisitante, setPenalesVisitante] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [allocations, setAllocations] = useState<ScorerAllocation[]>([])
  const [participaciones, setParticipaciones] = useState<ParticipacionInput[]>([])
  const [notas, setNotas] = useState("")
  const [expandedSection, setExpandedSection] = useState<"participantes" | "goleadores" | null>("goleadores")
  const toggleSection = (section: "participantes" | "goleadores") => setExpandedSection((current) => (current === section ? null : section))

  const handleParticipacionesChange = (next: ParticipacionInput[]) => {
    setParticipaciones(next)
  }

  useEffect(() => {
    if (!client) return
    let cancelled = false
    const loadPartido = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await client.getPartido()
        if (!cancelled) {
          setError(null)
          setRetryCountdown(0)
          setPartido(data)
          setGolesLocal(data.estado === "PROGRAMADO" ? "" : String(data.golesLocal))
          setGolesVisitante(data.estado === "PROGRAMADO" ? "" : String(data.golesVisitante))
          setPenalesLocal(data.penalesLocal == null ? "" : String(data.penalesLocal))
          setPenalesVisitante(data.penalesVisitante == null ? "" : String(data.penalesVisitante))
          setAllocations(allocationsFromAnnotations(data.anotaciones))
          setParticipaciones(participacionesFromResponse(data.participaciones))
          setNotas(data.notas ?? "")
          const hayGoleo = data.registrarGoleo || hayGoleadoresCapturados(data.anotaciones)
          setExpandedSection(
            data.registrarParticipaciones || (data.participaciones ?? []).length > 0 ? "participantes" : hayGoleo ? "goleadores" : null,
          )
        }
      } catch (requestError: any) {
        if (!cancelled) {
          setError(requestError)
          if (isRateLimitError(requestError)) setRetryCountdown(getRetryAfterSeconds(requestError) ?? 60)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPartido()
    return () => { cancelled = true }
  }, [client, loadAttempt])

  useEffect(() => {
    if (retryCountdown <= 0 && submitRetryCountdown <= 0) return
    const timeout = setTimeout(() => {
      setRetryCountdown((current) => Math.max(0, current - 1))
      setSubmitRetryCountdown((current) => Math.max(0, current - 1))
    }, 1000)
    return () => clearTimeout(timeout)
  }, [retryCountdown, submitRetryCountdown])

  const finalized = partido?.estado === "FINALIZADO"
  const localGoals = finalized ? String(partido.golesLocal) : golesLocal
  const visitorGoals = finalized ? String(partido.golesVisitante) : golesVisitante
  const tied = localGoals !== "" && visitorGoals !== "" && Number(localGoals) === Number(visitorGoals)
  const isPlayoff = partido?.tipoPartido === "ELIMINATORIA"
  const showPenales = !!partido && tied
    && (isPlayoff || (partido.tipoPartido !== "AMISTOSO" && partido.usarPenalesEnEmpates !== false))

  const handleSave = () => {
    if (!partido || !client || submitRetryCountdown > 0) return
    const schedulingError = getPlayoffFinalizationError(partido, partido.multiplesCanchas)
    if (schedulingError) {
      toast.error(schedulingError)
      return
    }
    if (golesLocal === "" || golesVisitante === "") {
      toast.error("Ingresa los goles de ambos equipos")
      return
    }
    const gl = Number(golesLocal)
    const gv = Number(golesVisitante)
    if (isNaN(gl) || isNaN(gv) || gl < 0 || gv < 0) {
      toast.error("Ingresa goles válidos")
      return
    }
    if (!hasValidAllocations(allocations, gl, gv)) {
      toast.error("Los goles asignados no pueden superar el marcador")
      return
    }
    if (partido.registrarParticipaciones) {
      const unnamedScorer = allocations.some((item) => !participaciones.some((p) => p.ladoMarcador === item.ladoMarcador && p.jugadorId === item.jugadorId))
      if (unnamedScorer) {
        toast.error("Todos los goleadores deben estar registrados como participantes")
        return
      }
    }
    if (!partido.registrarParticipaciones && (partido.participaciones ?? []).length > 0) {
      const historyKeys = new Set((partido.participaciones ?? []).map((p) => `${p.ladoMarcador}:${p.jugadorId}`))
      const scorerOutsideHistory = allocations.some((item) => !historyKeys.has(`${item.ladoMarcador}:${item.jugadorId}`))
      if (scorerOutsideHistory) {
        toast.error("El goleador no está en el historial de participantes. Activa el registro de participantes para corregir la lista")
        return
      }
    }

    let pl: number | null = null
    let pv: number | null = null
    if (showPenales) {
      pl = Number(penalesLocal)
      pv = Number(penalesVisitante)
      if (penalesLocal === "" || penalesVisitante === "" || isNaN(pl) || isNaN(pv) || pl === pv) {
        toast.error(isPlayoff ? "En eliminatoria, define un ganador por penales" : "Define un ganador por penales")
        return
      }
    }

    setSubmitting(true)
    const payload = buildResultPayload({ expectedVersion: partido.version, golesLocal: gl, golesVisitante: gv, penalesLocal: pl, penalesVisitante: pv, estado: "FINALIZADO", allocations: partido.registrarGoleo ? allocations : [], notas, ...(partido.registrarParticipaciones ? { participaciones } : {}) })
    client.updateResult(payload)
      .then((updated) => {
        setPartido((current) => current ? { ...current, ...updated, anotaciones: payload.allocations } : current)
        setNotas(updated.notas ?? "")
        setSubmitted(true)
        toast.success("Resultado guardado")
      })
      .catch(async (requestError) => {
        if (requestError?.response?.status === 409) {
          try {
            const fresh = await client.getPartido()
            setPartido(fresh)
            setGolesLocal(fresh.estado === "PROGRAMADO" ? "" : String(fresh.golesLocal))
            setGolesVisitante(fresh.estado === "PROGRAMADO" ? "" : String(fresh.golesVisitante))
            setPenalesLocal(fresh.penalesLocal == null ? "" : String(fresh.penalesLocal))
            setPenalesVisitante(fresh.penalesVisitante == null ? "" : String(fresh.penalesVisitante))
            setAllocations(allocationsFromAnnotations(fresh.anotaciones))
            setParticipaciones(participacionesFromResponse(fresh.participaciones))
            setNotas(fresh.notas ?? "")
          } catch (refreshError) {
            if (isRateLimitError(refreshError)) {
              setSubmitRetryCountdown(getRetryAfterSeconds(refreshError) ?? 60)
              toast.error((refreshError as Error).message)
            } else {
              toast.error("El partido cambió, pero no se pudo recargar el resultado.")
            }
            return
          }
          toast.error("El partido cambió. Recargamos el resultado para que lo revises.")
          return
        }
        if (isRateLimitError(requestError)) setSubmitRetryCountdown(getRetryAfterSeconds(requestError) ?? 60)
        toast.error(requestError.message)
      })
      .finally(() => setSubmitting(false))
  }

  if (!urlReady || deepLink === null) {
    return <View style={{ flex: 1, backgroundColor: Palette.black }}><LoadingScreen /></View>
  }

  if (!token) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.xl, padding: Pad.xl, alignItems: "center", gap: Gap.md, maxWidth: 340, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name="link-off" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.semiBold, textAlign: "center" }}>Enlace no válido</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center" }}>Abre este enlace desde la aplicación de Tenka.</Text>
        </View>
      </View>
    )
  }

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: Palette.black }}><LoadingScreen /></View>
  }

  if (error || !partido) {
    const limited = isRateLimitError(error)
    const message = error instanceof Error ? error.message : "No se pudo cargar el partido."
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.xl, padding: Pad.xl, alignItems: "center", gap: Gap.md, maxWidth: 340, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name={limited ? "schedule" : "link-off"} size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.semiBold, textAlign: "center" }}>{limited ? "Demasiadas solicitudes" : "Enlace no válido"}</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center" }}>{limited ? message : "Este enlace ha expirado, ya fue utilizado o no es válido."}</Text>
          {limited ? (
            <TouchableOpacity disabled={retryCountdown > 0} onPress={() => setLoadAttempt((current) => current + 1)} style={{ paddingVertical: Pad.sm, opacity: retryCountdown > 0 ? 0.5 : 1 }}>
              <Text style={{ color: Palette.cyan, fontSize: 14, fontFamily: Fonts.medium }}>{retryCountdown > 0 ? `Reintentar en ${retryCountdown}s` : "Reintentar"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.replace("/(drawer)")} style={{ paddingVertical: Pad.sm }}>
              <Text style={{ color: Palette.cyan, fontSize: 14, fontFamily: Fonts.medium }}>Cerrar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const tipoInfo = TIPO_INFO[partido.tipoPartido]
  const equipoLocalNombre = partido.equipoLocal?.nombre ?? "Local"
  const equipoVisitanteNombre = partido.equipoVisitante?.nombre ?? "Visitante"
  const scoreInputStyle = {
    width: 76,
    height: 68,
    borderRadius: Radius.lg,
    backgroundColor: Palette.black,
    borderWidth: 1,
    borderColor: finalized ? Palette.border : Palette.cyan,
    color: Palette.text,
    fontSize: 30,
    fontFamily: Fonts.displayBold,
    textAlign: "center" as const,
    padding: 0,
    opacity: finalized ? 0.7 : 1,
  }

  const localScorers = buildScorerCandidates(partido.jugadoresLocal, partido.anotaciones ?? [], "LOCAL")
  const visitorScorers = buildScorerCandidates(partido.jugadoresVisitante, partido.anotaciones ?? [], "VISITANTE")
  const participantRecords = [...(partido.participaciones ?? []), ...(partido.anotaciones ?? [])]
  const localParticipants = buildScorerCandidates(partido.jugadoresLocal, participantRecords, "LOCAL")
  const visitorParticipants = buildScorerCandidates(partido.jugadoresVisitante, participantRecords, "VISITANTE")

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: Pad.base, paddingTop: insets.top + Pad.sm, paddingBottom: insets.bottom + Pad.xl, gap: Gap.md }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity accessibilityLabel="Cerrar" onPress={() => router.replace("/(drawer)")} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="close" size={25} color={Palette.textMuted} />
          </TouchableOpacity>
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.display }}>Captura arbitral</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, padding: Pad.lg, gap: Gap.lg }}>
          <View style={{ alignItems: "center", gap: 3 }}>
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium }}>{partido.ligaNombre}</Text>
            <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>{partido.divisionNombre}</Text>
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium }}>{partido.jornadaNumero ? `Jornada ${partido.jornadaNumero}` : "Eliminatoria"}</Text>
          </View>

          <View style={{ gap: Gap.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
                <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
                  <Text style={{ color: Palette.text, fontSize: 11, fontFamily: Fonts.semiBold }}>{finalized ? "Finalizado" : "Programado"}</Text>
                </View>
                <View style={{ backgroundColor: tipoInfo.background, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
                  <Text style={{ color: tipoInfo.color, fontSize: 11, fontFamily: Fonts.semiBold }}>{tipoInfo.label}</Text>
                </View>
              </View>
              <TouchableOpacity accessibilityLabel="Información sobre la captura arbitral" activeOpacity={0.7} onPress={() => setHelpOpen(true)} style={{ width: 34, height: 34, borderRadius: Radius.full, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="info-outline" size={20} color={Palette.cyan} />
              </TouchableOpacity>
            </View>
            {partido.cancha?.nombre ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.micro }}>
                <MaterialIcons name="place" size={14} color={Palette.cyan} />
                <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans }}>{partido.cancha.nombre}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
              <LogoImage uri={partido.equipoLocal?.logo} size={60} backgroundColor={Palette.surfaceLight} ring={Palette.border} ringWidth={1} iconFallback="shield" />
              <Text style={{ minHeight: 36, color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{equipoLocalNombre}</Text>
              <TextInput accessibilityLabel={`Goles de ${equipoLocalNombre}`} style={scoreInputStyle} editable={!finalized} keyboardType="number-pad" maxLength={2} value={localGoals} onChangeText={setGolesLocal} placeholder="0" placeholderTextColor={Palette.textMuted} />
              <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>LOCAL</Text>
            </View>

            <View style={{ alignItems: "center", gap: Gap.sm }}>
              <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold }}>VS</Text>
              <View style={{ width: 1, height: 58, backgroundColor: Palette.border }} />
            </View>

            <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
              <LogoImage uri={partido.equipoVisitante?.logo} size={60} backgroundColor={Palette.surfaceLight} ring={Palette.border} ringWidth={1} iconFallback="shield" />
              <Text style={{ minHeight: 36, color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{equipoVisitanteNombre}</Text>
              <TextInput accessibilityLabel={`Goles de ${equipoVisitanteNombre}`} style={scoreInputStyle} editable={!finalized} keyboardType="number-pad" maxLength={2} value={visitorGoals} onChangeText={setGolesVisitante} placeholder="0" placeholderTextColor={Palette.textMuted} />
              <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>VISITANTE</Text>
            </View>
          </View>

          {partido.registrarParticipaciones || (partido.participaciones ?? []).length > 0 ? (
            <ParticipacionEditor localName={equipoLocalNombre} visitorName={equipoVisitanteNombre} localPlayers={localParticipants} visitorPlayers={visitorParticipants} participaciones={participaciones} onChange={handleParticipacionesChange} disabled={finalized || submitting} readOnly={!partido.registrarParticipaciones} expanded={expandedSection === "participantes"} onToggle={() => toggleSection("participantes")} />
          ) : null}

          {/* Igual que en la app: apagado pero con goles ya capturados, se muestra deshabilitado. */}
          {partido.registrarGoleo || hayGoleadoresCapturados(partido.anotaciones) ? (
            <ScorerAllocationEditor localName={equipoLocalNombre} visitorName={equipoVisitanteNombre} localScore={Math.max(0, Number(localGoals) || 0)} visitorScore={Math.max(0, Number(visitorGoals) || 0)} localPlayers={localScorers} visitorPlayers={visitorScorers} allocations={allocations} onChange={setAllocations} disabled={finalized || submitting || !partido.registrarGoleo} participantes={participaciones} limitToParticipantes={partido.registrarParticipaciones} expanded={expandedSection === "goleadores"} onToggle={() => toggleSection("goleadores")} />
          ) : null}

          {showPenales ? (
            <View style={{ backgroundColor: Palette.warning10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.warning, padding: Pad.md, gap: Gap.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <MaterialIcons name="flag" size={18} color={Palette.warning} />
                <Text style={{ flex: 1, color: Palette.warning, fontSize: 13, fontFamily: Fonts.semiBold }}>Desempate por penales</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: Gap.md }}>
                <TextInput accessibilityLabel={`Penales de ${equipoLocalNombre}`} style={{ ...scoreInputStyle, width: 72, height: 54, fontSize: 24, borderColor: Palette.warning }} editable={!finalized} keyboardType="number-pad" maxLength={2} value={finalized ? String(partido.penalesLocal ?? "") : penalesLocal} onChangeText={setPenalesLocal} placeholder="0" placeholderTextColor={Palette.textMuted} />
                <Text style={{ color: Palette.warning, fontSize: 18, fontFamily: Fonts.displayBold }}>-</Text>
                <TextInput accessibilityLabel={`Penales de ${equipoVisitanteNombre}`} style={{ ...scoreInputStyle, width: 72, height: 54, fontSize: 24, borderColor: Palette.warning }} editable={!finalized} keyboardType="number-pad" maxLength={2} value={finalized ? String(partido.penalesVisitante ?? "") : penalesVisitante} onChangeText={setPenalesVisitante} placeholder="0" placeholderTextColor={Palette.textMuted} />
              </View>
            </View>
          ) : null}

          <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.md, gap: Gap.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
                <MaterialIcons name="notes" size={18} color={Palette.textMuted} />
                <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>Notas del partido</Text>
              </View>
              <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>{notas.length}/1000</Text>
            </View>
            <TextInput
              accessibilityLabel="Notas del partido"
              style={{ minHeight: 72, borderRadius: Radius.md, borderWidth: 1, borderColor: finalized ? Palette.border : Palette.borderActive, backgroundColor: Palette.black, color: Palette.text, fontSize: 13, fontFamily: Fonts.sans, padding: Pad.sm, textAlignVertical: "top" }}
              multiline
              editable={!finalized}
              value={finalized ? (partido.notas ?? "") : notas}
              onChangeText={setNotas}
              maxLength={1000}
              placeholder="Notas internas para el dueño y el árbitro..."
              placeholderTextColor={Palette.textMuted}
            />
          </View>

          {finalized ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.success10, borderRadius: Radius.lg, padding: Pad.md }}>
              <MaterialIcons name="check-circle" size={22} color={Palette.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>{submitted ? "Resultado enviado" : "Partido finalizado"}</Text>
                <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>{submitted ? "El enlace ya fue utilizado y no admite más cambios." : "Este partido ya tiene un resultado registrado."}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={handleSave} disabled={submitting || submitRetryCountdown > 0} style={{ backgroundColor: Palette.cyan, borderRadius: Radius.lg, paddingVertical: Pad.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: Gap.sm, opacity: submitting || submitRetryCountdown > 0 ? 0.6 : 1 }}>
              {submitting ? <ActivityIndicator size="small" color={Palette.dark} /> : <MaterialIcons name="check-circle" size={20} color={Palette.dark} />}
              <Text style={{ color: Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>{submitRetryCountdown > 0 ? `Reintentar en ${submitRetryCountdown}s` : "Finalizar partido"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>

      <AppBottomSheetModal visible={helpOpen} onClose={() => setHelpOpen(false)} title="Captura arbitral" snapPoints={["42%"]}>
        <View style={{ gap: Gap.md }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.md }}>
            <View style={{ width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="check-circle" size={20} color={Palette.cyan} /></View>
            <View style={{ flex: 1, gap: 3 }}><Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>Finalizar partido</Text><Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, lineHeight: 18 }}>Envía el resultado final y consume este enlace de un solo uso.</Text></View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.md }}>
            <View style={{ width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Palette.warning10, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="flag" size={20} color={Palette.warning} /></View>
            <View style={{ flex: 1, gap: 3 }}><Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>Penales</Text><Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, lineHeight: 18 }}>Si el marcador queda empatado y se requiere un ganador, registra también el desempate.</Text></View>
          </View>
        </View>
      </AppBottomSheetModal>
    </View>
  )
}
