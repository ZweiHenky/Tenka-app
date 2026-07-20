import { useState, useMemo } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { useLocalSearchParams, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useToast } from "@/shared/components/Toast"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { useRefereePartido, useUpdateRefereeResult } from "@/features/partido/hooks/usePartidos"

function formatFechaHora(fechaStr: string | null): string {
  if (!fechaStr) return "—"
  const d = new Date(fechaStr)
  if (isNaN(d.getTime())) return "—"
  const dia = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return `${dia} ${hora}`
}

export default function ArbitroScreen() {
  const toast = useToast()
  const { token } = useLocalSearchParams<{ token: string }>()
  const [golesLocal, setGolesLocal] = useState("")
  const [golesVisitante, setGolesVisitante] = useState("")
  const [penalesLocal, setPenalesLocal] = useState("")
  const [penalesVisitante, setPenalesVisitante] = useState("")
  const [editing, setEditing] = useState(false)

  const { data: partido, isLoading, error, refetch } = useRefereePartido(token!)
  const { mutate: updateResult, isPending } = useUpdateRefereeResult()

  const finalized = partido?.estado === "FINALIZADO"
  const isPlayoff = partido?.jornadaNumero == null

  const showPenales = useMemo(() => {
    if (!partido || finalized) return false
    const gl = Number(golesLocal)
    const gv = Number(golesVisitante)
    return !isNaN(gl) && !isNaN(gv) && gl === gv
  }, [partido, golesLocal, golesVisitante, finalized])

  const handleSave = () => {
    if (!partido || !token) return
    const gl = Number(golesLocal)
    const gv = Number(golesVisitante)
    if (isNaN(gl) || isNaN(gv) || gl < 0 || gv < 0) {
      toast.error("Ingresa goles válidos")
      return
    }
    if (isPlayoff && gl === gv) {
      const pl = Number(penalesLocal)
      const pv = Number(penalesVisitante)
      if (isNaN(pl) || isNaN(pv) || pl === pv) {
        toast.error("En eliminatoria, define un ganador por penales")
        return
      }
    }
    updateResult(
      {
        token,
        golesLocal: gl,
        golesVisitante: gv,
        penalesLocal: showPenales ? Number(penalesLocal) : null,
        penalesVisitante: showPenales ? Number(penalesVisitante) : null,
        estado: "FINALIZADO",
      },
      {
        onSuccess: () => {
          toast.success("Resultado guardado")
          setEditing(true)
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center" }}>
        <LoadingScreen />
      </View>
    )
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.xl, alignItems: "center", gap: Gap.md, maxWidth: 340, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name="link-off" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.semiBold, textAlign: "center" }}>Enlace no válido</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center" }}>Este enlace ha expirado, ya fue utilizado o no es válido.</Text>
        </View>
      </View>
    )
  }

  if (!partido || finalized) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.xl, alignItems: "center", gap: Gap.md, maxWidth: 340, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name="check-circle" size={48} color={Palette.cyan} />
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.semiBold, textAlign: "center" }}>Partido finalizado</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center" }}>
            {partido?.equipoLocal?.nombre ?? "Local"} {partido?.golesLocal} - {partido?.golesVisitante} {partido?.equipoVisitante?.nombre ?? "Visitante"}
            {partido?.penalesLocal != null ? ` (${partido.penalesLocal}-${partido.penalesVisitante} penales)` : ""}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black, padding: Pad.base }}>
      <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1, borderColor: Palette.border, marginTop: Pad.xl }}>
        <View style={{ backgroundColor: Palette.cyan10, padding: Pad.base, alignItems: "center", gap: 2 }}>
          <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium }}>{partido.ligaNombre}</Text>
          <Text style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>{partido.divisionNombre}</Text>
          {partido.jornadaNumero ? (
            <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium }}>Jornada {partido.jornadaNumero}</Text>
          ) : null}
        </View>

        <View style={{ padding: Pad.base, gap: Gap.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>{formatFechaHora(partido.fecha)}</Text>
            {partido.cancha ? (
              <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>{partido.cancha.nombre}</Text>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
            <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{partido.equipoLocal?.nombre ?? "Local"}</Text>
            </View>
            <Text style={{ color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>VS</Text>
            <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
              <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{partido.equipoVisitante?.nombre ?? "Visitante"}</Text>
            </View>
          </View>

          {editing ? (
            <View style={{ alignItems: "center", gap: Gap.sm, paddingTop: Pad.md }}>
              <MaterialIcons name="check-circle" size={40} color={Palette.cyan} />
              <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.semiBold }}>Resultado enviado</Text>
              <TouchableOpacity onPress={() => setEditing(false)} style={{ paddingVertical: Pad.sm }}>
                <Text style={{ color: Palette.cyan, fontSize: 14, fontFamily: Fonts.medium }}>Editar de nuevo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: Gap.md, paddingTop: Pad.sm }}>
              <View style={{ flexDirection: "row", gap: Gap.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium, marginBottom: 4 }}>{partido.equipoLocal?.nombre ?? "Local"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.sm }}>
                    <MaterialIcons name="sports-soccer" size={18} color={Palette.textMuted} />
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <TextInput
                        style={{ fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text, textAlign: "center", paddingVertical: Pad.sm, minWidth: 60 }}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={golesLocal}
                        onChangeText={setGolesLocal}
                        placeholder="0"
                        placeholderTextColor={Palette.textMuted}
                      />
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium, marginBottom: 4 }}>{partido.equipoVisitante?.nombre ?? "Visitante"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.sm }}>
                    <MaterialIcons name="sports-soccer" size={18} color={Palette.textMuted} />
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <TextInput
                        style={{ fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text, textAlign: "center", paddingVertical: Pad.sm, minWidth: 60 }}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={golesVisitante}
                        onChangeText={setGolesVisitante}
                        placeholder="0"
                        placeholderTextColor={Palette.textMuted}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {showPenales ? (
                <View style={{ gap: Gap.sm }}>
                  <Text style={{ color: Palette.warning, fontSize: 12, fontFamily: Fonts.semiBold, textAlign: "center" }}>Penales</Text>
                  <View style={{ flexDirection: "row", gap: Gap.md }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.sm }}>
                        <MaterialIcons name="flag" size={18} color={Palette.textMuted} />
                        <View style={{ flex: 1, alignItems: "center" }}>
                          <TextInput
                            style={{ fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text, textAlign: "center", paddingVertical: Pad.sm, minWidth: 60 }}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={penalesLocal}
                            onChangeText={setPenalesLocal}
                            placeholder="0"
                            placeholderTextColor={Palette.textMuted}
                          />
                        </View>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.sm }}>
                        <MaterialIcons name="flag" size={18} color={Palette.textMuted} />
                        <View style={{ flex: 1, alignItems: "center" }}>
                          <TextInput
                            style={{ fontSize: 24, fontFamily: Fonts.displayBold, color: Palette.text, textAlign: "center", paddingVertical: Pad.sm, minWidth: 60 }}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={penalesVisitante}
                            onChangeText={setPenalesVisitante}
                            placeholder="0"
                            placeholderTextColor={Palette.textMuted}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSave}
                disabled={isPending}
                style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", opacity: isPending ? 0.6 : 1 }}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={Palette.dark} />
                ) : (
                  <Text style={{ color: Palette.dark, fontSize: 16, fontFamily: Fonts.semiBold }}>Finalizar partido</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
