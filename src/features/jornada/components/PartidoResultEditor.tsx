import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { useToast } from "@/shared/components/Toast"
import { getPlayoffFinalizationError } from "@/shared/utils/playoff-finalization"
import { ACTION_HELP, secondaryActions } from "@/features/jornada/utils/partido-acciones"
import ScorerAllocationEditor from "@/features/partido/components/ScorerAllocationEditor"
import ParticipacionEditor from "@/features/partido/components/ParticipacionEditor"
import { allocationsFromAnnotations, hasValidAllocations, hayGoleadoresCapturados, isResultEditable, participacionesFromResponse, type ParticipacionInput, type ScorerAllocation, type ScorerCandidate } from "@/features/partido/scoring"

const ESTADO_LABELS: Record<string, string> = {
  PROGRAMADO: "Programado",
  EN_JUEGO: "En juego",
  FINALIZADO: "Finalizado",
  SUSPENDIDO: "Suspendido",
}

const TIPO_INFO = {
  REGULAR: { label: "Regular", color: Palette.cyan, background: Palette.cyan10 },
  AMISTOSO: { label: "Amistoso", color: Palette.success, background: Palette.success10 },
  COMPLEMENTO: { label: "Completar", color: Palette.warning, background: Palette.warning10 },
  ELIMINATORIA: { label: "Eliminatoria", color: Palette.playoff, background: Palette.playoff10 },
} as const


interface Props {
  partido: PartidoResponse
  isUpdating: boolean
  registrarParticipaciones?: boolean
  registrarGoleo?: boolean
  usarPenalesEnEmpates?: boolean
  onSave: (golesLocal: number, golesVisitante: number, estado: string, anotaciones: ScorerAllocation[], penalesLocal?: number, penalesVisitante?: number, tipoPartido?: string, participaciones?: ParticipacionInput[], notas?: string | null) => void
  onReplaceTeam?: (side: "local" | "visitor") => void
  canReplaceTeams?: boolean
  multiplesCanchas?: boolean
  localPlayers?: ScorerCandidate[]
  visitorPlayers?: ScorerCandidate[]
  localParticipantPlayers?: ScorerCandidate[]
  visitorParticipantPlayers?: ScorerCandidate[]
  /** Solo en partidos del cuadro: deja ver quién no llega al mínimo antes de guardar. */
  partidosPorJugador?: Record<string, number>
  minimoEliminatoria?: number
}

function PartidoResultEditorForm({ partido, isUpdating, registrarParticipaciones = false, registrarGoleo = true, usarPenalesEnEmpates = true, onSave, onReplaceTeam, canReplaceTeams = false, multiplesCanchas = false, localPlayers = [], visitorPlayers = [], localParticipantPlayers = localPlayers, visitorParticipantPlayers = visitorPlayers, partidosPorJugador, minimoEliminatoria }: Props) {
  const toast = useToast()
  const arbitros = partido.arbitros?.map((arbitro) => arbitro.nombre).filter(Boolean).join(", ") ?? ""
  const [golesLocal, setGolesLocal] = useState(() => partido.estado === "PROGRAMADO" || !partido.estado ? "" : String(partido.golesLocal))
  const [golesVisitante, setGolesVisitante] = useState(() => partido.estado === "PROGRAMADO" || !partido.estado ? "" : String(partido.golesVisitante))
  const [penalesLocal, setPenalesLocal] = useState(() => partido.penalesLocal != null ? String(partido.penalesLocal) : "")
  const [penalesVisitante, setPenalesVisitante] = useState(() => partido.penalesVisitante != null ? String(partido.penalesVisitante) : "")
  const [actionHelpOpen, setActionHelpOpen] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [allocations, setAllocations] = useState<ScorerAllocation[]>(() => allocationsFromAnnotations(partido.anotaciones))
  const [participaciones, setParticipaciones] = useState<ParticipacionInput[]>(() => participacionesFromResponse(partido.participaciones))
  const [notas, setNotas] = useState(() => partido.notas ?? "")
  const hasParticipantes = registrarParticipaciones || (partido.participaciones ?? []).length > 0
  // Con el goleo apagado el editor sigue apareciendo si el partido ya tiene goleadores, pero
  // deshabilitado: esconderlo dejaría esos goles invisibles e incorregibles.
  // Sobre lo persistido, no sobre el estado editable: mirando `allocations`, la tarjeta
  // desaparecería a media edición en cuanto se vaciaran los goleadores.
  const hasGoleadores = registrarGoleo || hayGoleadoresCapturados(partido.anotaciones)
  const [expandedSection, setExpandedSection] = useState<"participantes" | "goleadores" | null>(
    hasParticipantes ? "participantes" : hasGoleadores ? "goleadores" : null,
  )
  const toggleSection = (section: "participantes" | "goleadores") => setExpandedSection((current) => (current === section ? null : section))

  const handleParticipacionesChange = (next: ParticipacionInput[]) => {
    setParticipaciones(next)
  }

  const parseGoles = () => {
    const gl = parseInt(golesLocal, 10)
    const gv = parseInt(golesVisitante, 10)
    if (isNaN(gl) || isNaN(gv)) {
      toast.error("Ingresa valores numéricos válidos")
      return null
    }
    return { gl, gv }
  }

  const parsePenales = () => {
    const pl = penalesLocal === "" ? null : parseInt(penalesLocal, 10)
    const pv = penalesVisitante === "" ? null : parseInt(penalesVisitante, 10)
    if (pl != null && isNaN(pl)) return null
    if (pv != null && isNaN(pv)) return null
    return { pl, pv }
  }

  const handleSave = () => {
    const schedulingError = getPlayoffFinalizationError(partido, multiplesCanchas)
    if (schedulingError) {
      toast.error(schedulingError)
      return
    }

    const parsed = parseGoles()
    if (!parsed) return
    if (parsed.gl < 0 || parsed.gv < 0 || !hasValidAllocations(allocations, parsed.gl, parsed.gv)) {
      toast.error("Los goles asignados no pueden superar el marcador")
      return
    }
    if (registrarParticipaciones) {
      const unnamedScorer = allocations.some((item) => !participaciones.some((p) => p.ladoMarcador === item.ladoMarcador && p.jugadorId === item.jugadorId))
      if (unnamedScorer) {
        toast.error("Todos los goleadores deben estar registrados como participantes")
        return
      }
    }
    if (!registrarParticipaciones && (partido.participaciones ?? []).length > 0) {
      const historyKeys = new Set((partido.participaciones ?? []).map((p) => `${p.ladoMarcador}:${p.jugadorId}`))
      const scorerOutsideHistory = allocations.some((item) => !historyKeys.has(`${item.ladoMarcador}:${item.jugadorId}`))
      if (scorerOutsideHistory) {
        toast.error("El goleador no está en el historial de participantes. Activa el registro de participantes para corregir la lista")
        return
      }
    }
    const penales = parsePenales()

    const requierePenales = parsed.gl === parsed.gv
      && (partido.tipoPartido === "ELIMINATORIA" || (partido.tipoPartido !== "AMISTOSO" && usarPenalesEnEmpates))
    if (requierePenales) {
      if (penales?.pl == null || penales?.pv == null) {
        toast.error("Ingresa los penales para definir al ganador")
        return
      }
      if (penales.pl === penales.pv) {
        toast.error("Los penales no pueden quedar empatados")
        return
      }
    }

    onSave(parsed.gl, parsed.gv, "FINALIZADO", registrarGoleo ? allocations : [], requierePenales ? (penales?.pl ?? undefined) : undefined, requierePenales ? (penales?.pv ?? undefined) : undefined, partido.tipoPartido, registrarParticipaciones ? participaciones : undefined, notas)
  }

  const handleSecondary = (targetEstado: string) => {
    if (targetEstado === "PROGRAMADO") {
      onSave(0, 0, "PROGRAMADO", [], undefined, undefined, partido.tipoPartido)
      return
    }
    const parsed = parseGoles()
    if (!parsed) return
    const penales = parsePenales()
    onSave(parsed.gl, parsed.gv, targetEstado, allocations, penales?.pl ?? undefined, penales?.pv ?? undefined, partido.tipoPartido)
  }

  const golesIguales = (() => {
    const gl = parseInt(golesLocal, 10)
    const gv = parseInt(golesVisitante, 10)
    return !isNaN(gl) && !isNaN(gv) && gl === gv
  })()
  const mostrarPenales = golesIguales
    && (partido.tipoPartido === "ELIMINATORIA" || (partido.tipoPartido !== "AMISTOSO" && usarPenalesEnEmpates))

  const estado = partido.estado ?? "PROGRAMADO"
  const estadoLabel = ESTADO_LABELS[estado] ?? estado
  const tipoInfo = TIPO_INFO[partido.tipoPartido ?? "REGULAR"]
  const equipoLocalNombre = partido.equipoLocal?.nombre ?? "Local"
  const equipoVisitanteNombre = partido.equipoVisitante?.nombre ?? "Visitante"
  const actions = secondaryActions(estado)
  const isFinalizado = estado === "FINALIZADO"
  const inputsDisabled = !isResultEditable(estado, correcting)

  const scoreInputStyle = {
    width: 76,
    height: 68,
    borderRadius: Radius.lg,
    backgroundColor: Palette.black,
    borderWidth: 1,
    borderColor: inputsDisabled ? Palette.border : Palette.borderActive,
    fontSize: 30,
    fontFamily: Fonts.displayBold,
    color: Palette.text,
    textAlign: "center" as const,
    padding: 0,
    opacity: inputsDisabled ? 0.65 : 1,
  }

  return (
    <>
      <View style={{ gap: Gap.lg }}>
        <View style={{ gap: Gap.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: Gap.sm }}>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
                <View style={{ backgroundColor: estado === "SUSPENDIDO" ? Palette.danger10 : Palette.surfaceLight, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
                  <Text style={{ color: estado === "SUSPENDIDO" ? Palette.danger : Palette.text, fontSize: 11, fontFamily: Fonts.semiBold }}>{estadoLabel}</Text>
                </View>
                <View style={{ backgroundColor: tipoInfo.background, borderRadius: Radius.full, paddingHorizontal: Pad.md, paddingVertical: Pad.micro }}>
                  <Text style={{ color: tipoInfo.color, fontSize: 11, fontFamily: Fonts.semiBold }}>{tipoInfo.label}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityLabel="Información sobre las acciones del partido"
              onPress={() => setActionHelpOpen(true)}
              style={{ width: 34, height: 34, borderRadius: Radius.full, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}
            >
              <MaterialIcons name="info-outline" size={20} color={Palette.cyan} />
            </TouchableOpacity>
          </View>

          {partido.cancha?.nombre || arbitros ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Gap.md, paddingTop: Pad.sm }}>
              {partido.cancha?.nombre ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.micro }}>
                  <MaterialIcons name="place" size={14} color={Palette.cyan} />
                  <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans }}>{partido.cancha.nombre}</Text>
                </View>
              ) : null}
              {arbitros ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.micro }}>
                  <MaterialIcons name="sports" size={14} color={Palette.success} />
                  <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans }}>{arbitros}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
          <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
            <LogoImage uri={partido.equipoLocal?.logo} size={60} backgroundColor={Palette.surfaceLight} ring={Palette.border} ringWidth={1} radius={Radius.lg} iconFallback="shield" />
            <View style={{ minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.micro }}><Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold, textAlign: "center", flexShrink: 1 }} numberOfLines={2}>{equipoLocalNombre}</Text>{canReplaceTeams ? <TouchableOpacity accessibilityLabel="Cambiar equipo local" onPress={() => onReplaceTeam?.("local")} style={{ padding: Pad.micro }}><MaterialIcons name="edit" size={17} color={Palette.cyan} /></TouchableOpacity> : null}</View>
            <TextInput
              accessibilityLabel={`Goles de ${equipoLocalNombre}`}
              style={scoreInputStyle}
              keyboardType="number-pad"
              editable={!inputsDisabled}
              value={golesLocal}
              onChangeText={setGolesLocal}
              maxLength={2}
              placeholder="0"
              placeholderTextColor={Palette.textMuted}
            />
            <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>LOCAL</Text>
          </View>

          <View style={{ alignItems: "center", gap: Gap.sm }}>
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold }}>VS</Text>
            <View style={{ width: 1, height: 58, backgroundColor: Palette.border }} />
          </View>

          <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
            <LogoImage uri={partido.equipoVisitante?.logo} size={60} backgroundColor={Palette.surfaceLight} ring={Palette.border} ringWidth={1} radius={Radius.lg} iconFallback="shield" />
            <View style={{ minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.micro }}><Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold, textAlign: "center", flexShrink: 1 }} numberOfLines={2}>{equipoVisitanteNombre}</Text>{canReplaceTeams ? <TouchableOpacity accessibilityLabel="Cambiar equipo visitante" onPress={() => onReplaceTeam?.("visitor")} style={{ padding: Pad.micro }}><MaterialIcons name="edit" size={17} color={Palette.cyan} /></TouchableOpacity> : null}</View>
            <TextInput
              accessibilityLabel={`Goles de ${equipoVisitanteNombre}`}
              style={scoreInputStyle}
              keyboardType="number-pad"
              editable={!inputsDisabled}
              value={golesVisitante}
              onChangeText={setGolesVisitante}
              maxLength={2}
              placeholder="0"
              placeholderTextColor={Palette.textMuted}
            />
            <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>VISITANTE</Text>
          </View>
        </View>

        {hasParticipantes ? (
          <ParticipacionEditor localName={equipoLocalNombre} visitorName={equipoVisitanteNombre} localPlayers={localParticipantPlayers} visitorPlayers={visitorParticipantPlayers} participaciones={participaciones} onChange={handleParticipacionesChange} disabled={inputsDisabled || isUpdating} readOnly={!registrarParticipaciones} expanded={expandedSection === "participantes"} onToggle={() => toggleSection("participantes")} partidosPorJugador={partidosPorJugador} minimoEliminatoria={minimoEliminatoria} />
        ) : null}

        {hasGoleadores ? (
          <ScorerAllocationEditor localName={equipoLocalNombre} visitorName={equipoVisitanteNombre} localScore={Math.max(0, parseInt(golesLocal, 10) || 0)} visitorScore={Math.max(0, parseInt(golesVisitante, 10) || 0)} localPlayers={localPlayers} visitorPlayers={visitorPlayers} allocations={allocations} onChange={setAllocations} disabled={inputsDisabled || isUpdating || !registrarGoleo} participantes={participaciones} limitToParticipantes={registrarParticipaciones} expanded={expandedSection === "goleadores"} onToggle={() => toggleSection("goleadores")} />
        ) : null}

        {mostrarPenales ? (
          <View style={{ backgroundColor: Palette.warning10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.warning, padding: Pad.md, gap: Gap.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <MaterialIcons name="flag" size={18} color={Palette.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Palette.warning, fontSize: 13, fontFamily: Fonts.semiBold }}>Desempate por penales</Text>
                <Text style={{ color: Palette.textSecondary, fontSize: 11, fontFamily: Fonts.sans }}>El empate necesita un ganador.</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.md }}>
              <TextInput
                accessibilityLabel={`Penales de ${equipoLocalNombre}`}
                style={{ ...scoreInputStyle, width: 72, height: 54, fontSize: 24, borderColor: Palette.warning }}
                keyboardType="number-pad"
                editable={!inputsDisabled}
                value={penalesLocal}
                onChangeText={setPenalesLocal}
                maxLength={2}
                placeholder="0"
                placeholderTextColor={Palette.textMuted}
              />
              <Text style={{ color: Palette.warning, fontSize: 18, fontFamily: Fonts.displayBold }}>-</Text>
              <TextInput
                accessibilityLabel={`Penales de ${equipoVisitanteNombre}`}
                style={{ ...scoreInputStyle, width: 72, height: 54, fontSize: 24, borderColor: Palette.warning }}
                keyboardType="number-pad"
                editable={!inputsDisabled}
                value={penalesVisitante}
                onChangeText={setPenalesVisitante}
                maxLength={2}
                placeholder="0"
                placeholderTextColor={Palette.textMuted}
              />
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
            style={{ minHeight: 72, borderRadius: Radius.md, borderWidth: 1, borderColor: inputsDisabled ? Palette.border : Palette.borderActive, backgroundColor: Palette.black, color: Palette.text, fontSize: 13, fontFamily: Fonts.sans, padding: Pad.sm, textAlignVertical: "top" }}
            multiline
            editable={!inputsDisabled}
            value={notas}
            onChangeText={setNotas}
            maxLength={1000}
            placeholder="Notas internas para el dueño y el árbitro..."
            placeholderTextColor={Palette.textMuted}
          />
        </View>

        <View style={{ gap: Gap.sm }}>
          {!isFinalizado || correcting ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSave}
              disabled={isUpdating}
              style={{ backgroundColor: Palette.cyan, borderRadius: Radius.lg, paddingVertical: Pad.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: Gap.sm, opacity: isUpdating ? 0.6 : 1 }}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Palette.black} />
              ) : (
                <MaterialIcons name="check-circle" size={20} color={Palette.black} />
              )}
              <Text style={{ fontSize: 15, fontFamily: Fonts.semiBold, color: Palette.black }}>{correcting ? "Guardar corrección" : "Finalizar partido"}</Text>
            </TouchableOpacity>
          ) : null}

          {isFinalizado && !correcting ? <TouchableOpacity activeOpacity={0.7} onPress={() => setCorrecting(true)} disabled={isUpdating} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm, borderRadius: Radius.md, paddingVertical: Pad.md, backgroundColor: Palette.warning10, borderWidth: 1, borderColor: Palette.warning }}><MaterialIcons name="edit" size={18} color={Palette.warning} /><Text style={{ color: Palette.warning, fontFamily: Fonts.semiBold }}>Corregir resultado</Text></TouchableOpacity> : null}

          {actions.length > 0 ? (
            <View style={{ flexDirection: "row", gap: Gap.sm }}>
              {actions.map((action) => {
                const destructive = action.targetEstado === "SUSPENDIDO"
                const reopen = action.targetEstado === "PROGRAMADO"
                return (
                  <TouchableOpacity
                    key={action.targetEstado}
                    activeOpacity={0.7}
                    onPress={() => handleSecondary(action.targetEstado)}
                    disabled={isUpdating}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm, borderRadius: Radius.md, paddingVertical: Pad.md, backgroundColor: destructive ? Palette.danger10 : reopen ? Palette.cyan10 : Palette.surfaceLight, borderWidth: 1, borderColor: destructive ? Palette.danger : reopen ? Palette.cyan : Palette.border, opacity: isUpdating ? 0.6 : 1 }}
                  >
                    <MaterialIcons name={action.icon} size={18} color={destructive ? Palette.danger : reopen ? Palette.cyan : Palette.textSecondary} />
                    <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: destructive ? Palette.danger : reopen ? Palette.cyan : Palette.text }}>{action.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : null}
        </View>
      </View>

      <AppBottomSheetModal
        visible={actionHelpOpen}
        onClose={() => setActionHelpOpen(false)}
        title="Acciones del partido"
        snapPoints={["65%"]}
        scrollable
      >
        <View style={{ gap: Gap.md }}>
          {ACTION_HELP.map((item) => (
            <View key={item.title} style={{ flexDirection: "row", alignItems: "flex-start", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Pad.md }}>
              <View style={{ width: 38, height: 38, borderRadius: Radius.md, backgroundColor: item.background, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>{item.title}</Text>
                <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, lineHeight: 18 }}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </AppBottomSheetModal>
    </>
  )
}

export default function PartidoResultEditor(props: Props) {
  const { partido } = props
  const resultKey = `${partido.id}:${partido.version ?? ""}:${partido.estado ?? ""}:${partido.golesLocal}:${partido.golesVisitante}:${partido.penalesLocal ?? ""}:${partido.penalesVisitante ?? ""}:${partido.notas ?? ""}:${JSON.stringify(partido.anotaciones ?? [])}:${JSON.stringify(partido.participaciones ?? [])}`
  return <PartidoResultEditorForm key={resultKey} {...props} />
}
