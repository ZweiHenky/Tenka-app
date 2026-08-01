import { useEffect, useMemo, useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import * as Linking from "expo-linking"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useToast } from "@/shared/components/Toast"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import LoadingScreen from "@/shared/components/LoadingScreen"
import { refereeApiClient, type RefereePartidoResponse } from "@/features/partido/api/partidos"

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
  const [error, setError] = useState<string | null>(null)
  const [golesLocal, setGolesLocal] = useState("")
  const [golesVisitante, setGolesVisitante] = useState("")
  const [penalesLocal, setPenalesLocal] = useState("")
  const [penalesVisitante, setPenalesVisitante] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (!client) return
    let cancelled = false
    const loadPartido = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await client.getPartido()
        if (!cancelled) setPartido(data)
      } catch (requestError: any) {
        if (!cancelled) setError(requestError.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPartido()
    return () => { cancelled = true }
  }, [client])

  const finalized = partido?.estado === "FINALIZADO"
  const localGoals = finalized ? String(partido.golesLocal) : golesLocal
  const visitorGoals = finalized ? String(partido.golesVisitante) : golesVisitante
  const tied = localGoals !== "" && visitorGoals !== "" && Number(localGoals) === Number(visitorGoals)
  const showPenales = !!partido && partido.tipoPartido !== "AMISTOSO" && tied
  const isPlayoff = partido?.tipoPartido === "ELIMINATORIA"

  const handleSave = () => {
    if (!partido || !client) return
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
    client.updateResult({ golesLocal: gl, golesVisitante: gv, penalesLocal: pl, penalesVisitante: pv, estado: "FINALIZADO" })
      .then(() => {
        setPartido((current) => current ? { ...current, golesLocal: gl, golesVisitante: gv, penalesLocal: pl, penalesVisitante: pv, estado: "FINALIZADO" } : current)
        setSubmitted(true)
        toast.success("Resultado guardado")
      })
      .catch((requestError) => toast.error(requestError.message))
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
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black, justifyContent: "center", alignItems: "center", padding: Pad.xl }}>
        <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.xl, padding: Pad.xl, alignItems: "center", gap: Gap.md, maxWidth: 340, borderWidth: 1, borderColor: Palette.border }}>
          <MaterialIcons name="link-off" size={48} color={Palette.textMuted} />
          <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.semiBold, textAlign: "center" }}>Enlace no válido</Text>
          <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, textAlign: "center" }}>Este enlace ha expirado, ya fue utilizado o no es válido.</Text>
          <TouchableOpacity onPress={() => router.replace("/(drawer)")} style={{ paddingVertical: Pad.sm }}>
            <Text style={{ color: Palette.cyan, fontSize: 14, fontFamily: Fonts.medium }}>Cerrar</Text>
          </TouchableOpacity>
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
              <View style={{ width: 60, height: 60, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Palette.border }}>
                {partido.equipoLocal?.logo ? <Image source={{ uri: partido.equipoLocal.logo }} style={{ width: 60, height: 60 }} /> : <MaterialIcons name="shield" size={28} color={Palette.textMuted} />}
              </View>
              <Text style={{ minHeight: 36, color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{equipoLocalNombre}</Text>
              <TextInput accessibilityLabel={`Goles de ${equipoLocalNombre}`} style={scoreInputStyle} editable={!finalized} keyboardType="number-pad" maxLength={2} value={localGoals} onChangeText={setGolesLocal} placeholder="0" placeholderTextColor={Palette.textMuted} />
              <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>LOCAL</Text>
            </View>

            <View style={{ alignItems: "center", gap: Gap.sm }}>
              <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold }}>VS</Text>
              <View style={{ width: 1, height: 58, backgroundColor: Palette.border }} />
            </View>

            <View style={{ flex: 1, alignItems: "center", gap: Gap.sm }}>
              <View style={{ width: 60, height: 60, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Palette.border }}>
                {partido.equipoVisitante?.logo ? <Image source={{ uri: partido.equipoVisitante.logo }} style={{ width: 60, height: 60 }} /> : <MaterialIcons name="shield" size={28} color={Palette.textMuted} />}
              </View>
              <Text style={{ minHeight: 36, color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: "center" }} numberOfLines={2}>{equipoVisitanteNombre}</Text>
              <TextInput accessibilityLabel={`Goles de ${equipoVisitanteNombre}`} style={scoreInputStyle} editable={!finalized} keyboardType="number-pad" maxLength={2} value={visitorGoals} onChangeText={setGolesVisitante} placeholder="0" placeholderTextColor={Palette.textMuted} />
              <Text style={{ color: Palette.textMuted, fontSize: 10, fontFamily: Fonts.semiBold }}>VISITANTE</Text>
            </View>
          </View>

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

          {finalized ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, backgroundColor: Palette.success10, borderRadius: Radius.lg, padding: Pad.md }}>
              <MaterialIcons name="check-circle" size={22} color={Palette.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>{submitted ? "Resultado enviado" : "Partido finalizado"}</Text>
                <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>{submitted ? "El enlace ya fue utilizado y no admite más cambios." : "Este partido ya tiene un resultado registrado."}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={handleSave} disabled={submitting} style={{ backgroundColor: Palette.cyan, borderRadius: Radius.lg, paddingVertical: Pad.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: Gap.sm, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? <ActivityIndicator size="small" color={Palette.dark} /> : <MaterialIcons name="check-circle" size={20} color={Palette.dark} />}
              <Text style={{ color: Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>Finalizar partido</Text>
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
