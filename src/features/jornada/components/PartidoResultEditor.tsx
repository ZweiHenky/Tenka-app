import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { useToast } from "@/shared/components/Toast"
import { getPlayoffFinalizationError } from "@/shared/utils/playoff-finalization"
import ScorerAllocationEditor from "@/features/partido/components/ScorerAllocationEditor"
import { allocationsFromAnnotations, hasValidAllocations, isResultEditable, type ScorerAllocation, type ScorerCandidate } from "@/features/partido/scoring"

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

const ACTION_HELP: { icon: keyof typeof MaterialIcons.glyphMap; title: string; description: string; color: string; background: string }[] = [
  { icon: "check-circle", title: "Finalizar partido", description: "Guarda el resultado final y, cuando corresponde, actualiza la tabla de posiciones.", color: Palette.cyan, background: Palette.cyan10 },
  { icon: "pause-circle-outline", title: "Suspender", description: "Marca el partido como suspendido para que no cuente en la tabla.", color: Palette.danger, background: Palette.danger10 },
  { icon: "replay", title: "Reabrir", description: "Regresa el partido a programado y limpia el resultado para poder corregirlo.", color: Palette.cyan, background: Palette.cyan10 },
  { icon: "flag", title: "Penales", description: "Aparecen en empates no amistosos para definir un ganador.", color: Palette.warning, background: Palette.warning10 },
]

function secondaryActions(estado: string | null): { label: string; targetEstado: string; icon: keyof typeof MaterialIcons.glyphMap }[] {
  if (estado === "FINALIZADO") {
    return [
      { label: "Suspender", targetEstado: "SUSPENDIDO", icon: "pause-circle-outline" },
      { label: "Reabrir", targetEstado: "PROGRAMADO", icon: "replay" },
    ]
  }
  if (estado === "SUSPENDIDO") return [{ label: "Reabrir", targetEstado: "PROGRAMADO", icon: "replay" }]
  if (estado === "EN_JUEGO") return [{ label: "Suspender", targetEstado: "SUSPENDIDO", icon: "pause-circle-outline" }]
  return []
}

interface Props {
  partido: PartidoResponse
  isUpdating: boolean
  onSave: (golesLocal: number, golesVisitante: number, estado: string, anotaciones: ScorerAllocation[], penalesLocal?: number, penalesVisitante?: number, tipoPartido?: string) => void
  onReplaceTeam?: (side: "local" | "visitor") => void
  canReplaceTeams?: boolean
  multiplesCanchas?: boolean
  localPlayers?: ScorerCandidate[]
  visitorPlayers?: ScorerCandidate[]
}

function PartidoResultEditorForm({ partido, isUpdating, onSave, onReplaceTeam, canReplaceTeams = false, multiplesCanchas = false, localPlayers = [], visitorPlayers = [] }: Props) {
  const toast = useToast()
  const arbitros = partido.arbitros?.map((arbitro) => arbitro.nombre).filter(Boolean).join(", ") ?? ""
  const [golesLocal, setGolesLocal] = useState(() => partido.estado === "PROGRAMADO" || !partido.estado ? "" : String(partido.golesLocal))
  const [golesVisitante, setGolesVisitante] = useState(() => partido.estado === "PROGRAMADO" || !partido.estado ? "" : String(partido.golesVisitante))
  const [penalesLocal, setPenalesLocal] = useState(() => partido.penalesLocal != null ? String(partido.penalesLocal) : "")
  const [penalesVisitante, setPenalesVisitante] = useState(() => partido.penalesVisitante != null ? String(partido.penalesVisitante) : "")
  const [actionHelpOpen, setActionHelpOpen] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [allocations, setAllocations] = useState<ScorerAllocation[]>(() => allocationsFromAnnotations(partido.anotaciones))

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
    const penales = parsePenales()

    if (parsed.gl === parsed.gv && partido.tipoPartido !== "AMISTOSO") {
      if (penales?.pl == null || penales?.pv == null) {
        toast.error("Ingresa los penales para definir al ganador")
        return
      }
      if (penales.pl === penales.pv) {
        toast.error("Los penales no pueden quedar empatados")
        return
      }
    }

    onSave(parsed.gl, parsed.gv, "FINALIZADO", allocations, penales?.pl ?? undefined, penales?.pv ?? undefined, partido.tipoPartido)
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

        <ScorerAllocationEditor localName={equipoLocalNombre} visitorName={equipoVisitanteNombre} localScore={Math.max(0, parseInt(golesLocal, 10) || 0)} visitorScore={Math.max(0, parseInt(golesVisitante, 10) || 0)} localPlayers={localPlayers} visitorPlayers={visitorPlayers} allocations={allocations} onChange={setAllocations} disabled={inputsDisabled || isUpdating} />

        {golesIguales && partido.tipoPartido !== "AMISTOSO" ? (
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
  const resultKey = `${partido.id}:${partido.version ?? ""}:${partido.estado ?? ""}:${partido.golesLocal}:${partido.golesVisitante}:${partido.penalesLocal ?? ""}:${partido.penalesVisitante ?? ""}:${JSON.stringify(partido.anotaciones ?? [])}`
  return <PartidoResultEditorForm key={resultKey} {...props} />
}
