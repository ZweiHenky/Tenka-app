import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import type { PartidoResponse } from "@/features/jornada/api/jornadas"
import { useToast } from "@/shared/components/Toast"

const ESTADO_DESCS: Record<string, string> = {
  PROGRAMADO: "No se ha jugado",
  EN_JUEGO: "En curso",
  FINALIZADO: "Terminado, cuenta para la tabla",
  SUSPENDIDO: "Suspendido, no cuenta",
}

function buttonLabel(estado: string | null): string {
  if (estado === "FINALIZADO" || estado === "SUSPENDIDO") return "Guardar cambios"
  return "Finalizar"
}

function secondaryActions(estado: string | null): { label: string; targetEstado: string }[] {
  if (estado === "FINALIZADO") {
    return [
      { label: "Suspender", targetEstado: "SUSPENDIDO" },
      { label: "Reabrir", targetEstado: "PROGRAMADO" },
    ]
  }
  if (estado === "SUSPENDIDO") {
    return [{ label: "Reabrir", targetEstado: "PROGRAMADO" }]
  }
  if (estado === "EN_JUEGO") {
    return [{ label: "Suspender", targetEstado: "SUSPENDIDO" }]
  }
  return []
}

interface Props {
  partido: PartidoResponse
  isUpdating: boolean
  onSave: (golesLocal: number, golesVisitante: number, estado: string, penalesLocal?: number, penalesVisitante?: number, tipoPartido?: string) => void
}

export default function PartidoResultEditor({ partido, isUpdating, onSave }: Props) {
  const toast = useToast()
  const [golesLocal, setGolesLocal] = useState(() => String(partido.golesLocal))
  const [golesVisitante, setGolesVisitante] = useState(() => String(partido.golesVisitante))
  const [penalesLocal, setPenalesLocal] = useState(() => partido.penalesLocal != null ? String(partido.penalesLocal) : "")
  const [penalesVisitante, setPenalesVisitante] = useState(() => partido.penalesVisitante != null ? String(partido.penalesVisitante) : "")

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
    const parsed = parseGoles()
    if (!parsed) return

    const isEmpate = parsed.gl === parsed.gv
    const penales = parsePenales()

    if (isEmpate && partido.tipoPartido !== 'AMISTOSO') {
      if (penales?.pl == null || penales?.pv == null) {
        toast.error("Ingresa los penales para definir al ganador")
        return
      }
      if (penales.pl === penales.pv) {
        toast.error("Los penales no pueden quedar empatados")
        return
      }
    }

    if (partido.estado === "FINALIZADO"
        && (parsed.gl !== partido.golesLocal || parsed.gv !== partido.golesVisitante)) {
      Alert.alert(
        "Modificar resultado",
        "¿Estás seguro de cambiar el resultado de un partido ya finalizado?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Guardar", onPress: () => onSave(parsed.gl, parsed.gv, "FINALIZADO", penales?.pl ?? undefined, penales?.pv ?? undefined, partido.tipoPartido) },
        ],
      )
      return
    }

    onSave(parsed.gl, parsed.gv, "FINALIZADO", penales?.pl ?? undefined, penales?.pv ?? undefined, partido.tipoPartido)
  }

  const handleSecondary = (targetEstado: string) => {
    const parsed = parseGoles()
    if (!parsed) return
    const penales = parsePenales()
    onSave(parsed.gl, parsed.gv, targetEstado, penales?.pl ?? undefined, penales?.pv ?? undefined, partido.tipoPartido)
  }

  const golesIguales = (() => {
    const gl = parseInt(golesLocal, 10)
    const gv = parseInt(golesVisitante, 10)
    return !isNaN(gl) && !isNaN(gv) && gl === gv
  })()

  const estado = partido.estado ?? null
  const actions = secondaryActions(estado)
  const label = buttonLabel(estado)

  const equipoLocalNombre = partido.equipoLocal?.nombre ?? "—"
  const equipoVisitanteNombre = partido.equipoVisitante?.nombre ?? "—"

  return (
    <View style={{ gap: Gap.base }}>
      {estado ? (
        <View style={{ alignItems: "center", gap: 2 }}>
          <View style={{
            backgroundColor: estado === "SUSPENDIDO" ? Palette.danger : Palette.surfaceLight,
            borderRadius: Radius.sm, paddingHorizontal: Pad.sm, paddingVertical: 2,
          }}>
            <Text style={{
              fontSize: 10, fontWeight: "700",
              color: estado === "SUSPENDIDO" ? Palette.text : Palette.textMuted,
            }}>{estado}</Text>
          </View>
          <Text style={{
            fontSize: 11,
            color: estado === "SUSPENDIDO" ? Palette.danger : Palette.textMuted,
          }}>{ESTADO_DESCS[estado]}</Text>
        </View>
      ) : null}

      {partido.tipoPartido === 'AMISTOSO' ? (
        <View style={{
          backgroundColor: Palette.warning10,
          borderRadius: Radius.sm, paddingHorizontal: Pad.sm, paddingVertical: 2, alignSelf: "center",
        }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: Palette.warning }}>
            Amistoso - nadie suma puntos
          </Text>
        </View>
      ) : partido.tipoPartido === 'COMPLEMENTO' ? (
        <View style={{
          backgroundColor: Palette.danger10,
          borderRadius: Radius.sm, paddingHorizontal: Pad.sm, paddingVertical: 2, alignSelf: "center",
        }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: Palette.danger }}>
            Completar - {equipoVisitanteNombre} no suma puntos
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: Gap.base }}>
        <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
          <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.semiBold }}>LOCAL</Text>
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center" }}>
            {partido.equipoLocal?.logo ? (
              <Image source={{ uri: partido.equipoLocal.logo }} style={{ width: 44, height: 44 }} resizeMode="cover" />
            ) : (
              <MaterialIcons name="shield" size={22} color={Palette.textMuted} />
            )}
          </View>
          <Text style={{ fontSize: 13, color: Palette.text, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>
            {equipoLocalNombre}
          </Text>
          <TextInput
            style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, width: "100%", height: 56, textAlign: "center", fontSize: 26, fontFamily: Fonts.displayBold, color: Palette.text, borderWidth: 1, borderColor: Palette.border }}
            keyboardType="number-pad"
            value={golesLocal}
            onChangeText={setGolesLocal}
            maxLength={2}
          />
        </View>

        <View style={{ justifyContent: "center" }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 12, fontFamily: Fonts.semiBold, color: Palette.warning }}>VS</Text>
          </View>
        </View>

        <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
          <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.semiBold }}>VISITANTE</Text>
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center" }}>
            {partido.equipoVisitante?.logo ? (
              <Image source={{ uri: partido.equipoVisitante.logo }} style={{ width: 44, height: 44 }} resizeMode="cover" />
            ) : (
              <MaterialIcons name="shield" size={22} color={Palette.textMuted} />
            )}
          </View>
          <Text style={{ fontSize: 13, color: Palette.text, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>
            {equipoVisitanteNombre}
          </Text>
          <TextInput
            style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, width: "100%", height: 56, textAlign: "center", fontSize: 26, fontFamily: Fonts.displayBold, color: Palette.text, borderWidth: 1, borderColor: Palette.border }}
            keyboardType="number-pad"
            value={golesVisitante}
            onChangeText={setGolesVisitante}
            maxLength={2}
          />
        </View>
      </View>

      {golesIguales && partido.tipoPartido !== 'AMISTOSO' ? (
        <View style={{ backgroundColor: Palette.warning10, borderRadius: Radius.md, padding: Pad.md, gap: Gap.sm }}>
          <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.warning, textAlign: "center" }}>
            Penales
          </Text>
          <Text style={{ fontSize: 11, color: Palette.textMuted, textAlign: "center", marginBottom: Gap.sm }}>
            El partido está empatado. Define al ganador por penales (ganador: 2 pts, perdedor: 1 pt)
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.xl }}>
            <View style={{ alignItems: "center", gap: Gap.sm }}>
              <Text style={{ fontSize: 11, color: Palette.textMuted }}>{equipoLocalNombre}</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, width: 70, height: 50, textAlign: "center", fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text, borderWidth: 1, borderColor: Palette.border }}
                keyboardType="number-pad"
                value={penalesLocal}
                onChangeText={setPenalesLocal}
                maxLength={2}
              />
            </View>
            <Text style={{ fontSize: 14, color: Palette.textMuted }}>-</Text>
            <View style={{ alignItems: "center", gap: Gap.sm }}>
              <Text style={{ fontSize: 11, color: Palette.textMuted }}>{equipoVisitanteNombre}</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, width: 70, height: 50, textAlign: "center", fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text, borderWidth: 1, borderColor: Palette.border }}
                keyboardType="number-pad"
                value={penalesVisitante}
                onChangeText={setPenalesVisitante}
                maxLength={2}
              />
            </View>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleSave}
        disabled={isUpdating}
        style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, paddingHorizontal: Pad.xl, alignItems: "center", width: "100%", opacity: isUpdating ? 0.6 : 1 }}
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color={Palette.black} />
        ) : (
          <Text style={{ fontSize: 16, fontFamily: Fonts.semiBold, color: Palette.black }}>{label}</Text>
        )}
      </TouchableOpacity>

      {actions.length > 0 ? (
        <View style={{ flexDirection: "row", gap: Gap.sm, width: "100%" }}>
          {actions.map((a) => {
            const isDestructive = a.label === "Suspender"
            return (
              <TouchableOpacity
                key={a.targetEstado}
                onPress={() => handleSecondary(a.targetEstado)}
                disabled={isUpdating}
                style={{
                  flex: 1, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center",
                  backgroundColor: isDestructive ? Palette.danger : Palette.surfaceLight,
                  opacity: isUpdating ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: Fonts.medium, color: Palette.text }}>{a.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
