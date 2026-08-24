import { useMemo, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Fonts, Gap, Pad, Radius } from "@/constants/theme"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import {
  availableTeamsForPair,
  buildBracketPairs,
  validateBracketPairs,
  type BracketPair,
  type BracketPairDraft,
  type Siembra,
} from "@/features/division/utils/playoff"

export interface BracketTeam {
  id: string
  nombre: string
}

interface Props {
  visible: boolean
  onClose: () => void
  opcionesEquipos: number[]
  equipos: BracketTeam[]
  /** Sin fase de liga no hay tabla que sembrar, así que esa opción no se ofrece. */
  permiteSiembraPorPosiciones: boolean
  siembraPorDefecto: Siembra
  generateRondasIsPending: boolean
  onSelect: (cantidadEquipos: number, siembra: Siembra, llaves?: BracketPair[]) => void
}

type Paso = "cantidad" | "siembra" | "llaves"

const SIEMBRA_INFO: Record<Siembra, { titulo: string; detalle: string; icono: keyof typeof MaterialIcons.glyphMap }> = {
  POSICIONES: { titulo: "Por posiciones", detalle: "El primero contra el último, según la tabla", icono: "leaderboard" },
  ALEATORIA: { titulo: "Sorteo aleatorio", detalle: "Los cruces salen al azar", icono: "shuffle" },
  MANUAL: { titulo: "Manual", detalle: "Eliges cada enfrentamiento", icono: "touch-app" },
}

export default function PlayoffTeamSelectorModal({
  visible,
  onClose,
  opcionesEquipos,
  equipos,
  permiteSiembraPorPosiciones,
  siembraPorDefecto,
  generateRondasIsPending,
  onSelect,
}: Props) {
  const [paso, setPaso] = useState<Paso>("cantidad")
  const [cantidad, setCantidad] = useState<number | null>(null)
  const [pairs, setPairs] = useState<BracketPairDraft[]>([])
  const [picking, setPicking] = useState<{ index: number; side: "local" | "visitante" } | null>(null)

  const siembras: Siembra[] = permiteSiembraPorPosiciones
    ? ["POSICIONES", "ALEATORIA", "MANUAL"]
    : ["ALEATORIA", "MANUAL"]

  const error = useMemo(
    () => (cantidad !== null && paso === "llaves" ? validateBracketPairs(pairs, cantidad) : null),
    [cantidad, pairs, paso],
  )

  const elegirCantidad = (n: number) => {
    setCantidad(n)
    setPaso("siembra")
  }

  const elegirSiembra = (siembra: Siembra) => {
    if (cantidad === null) return
    if (siembra !== "MANUAL") {
      onSelect(cantidad, siembra)
      return
    }
    setPairs(Array.from({ length: cantidad / 2 }, () => ({})))
    setPaso("llaves")
  }

  const confirmarManual = () => {
    if (cantidad === null) return
    const llaves = buildBracketPairs(pairs, cantidad)
    if (!llaves) return
    onSelect(cantidad, "MANUAL", llaves)
  }

  const asignar = (equipoId: string) => {
    if (!picking) return
    setPairs((previos) => previos.map((pair, index) => (index !== picking.index
      ? pair
      : { ...pair, [picking.side === "local" ? "equipoLocalId" : "equipoVisitanteId"]: equipoId })))
    setPicking(null)
  }

  const nombreDe = (equipoId?: string) => equipos.find((equipo) => equipo.id === equipoId)?.nombre

  const title = paso === "cantidad"
    ? "¿Cuántos equipos pasan?"
    : paso === "siembra"
      ? "¿Cómo se arma el cruce?"
      : picking
        ? "Elige el equipo"
        : "Arma los cruces"

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title={title} snapPoints={[paso === "cantidad" ? "45%" : "80%"]}>
      {paso === "cantidad" ? (
        <View style={{ alignItems: "center", gap: 20 }}>
          <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: Gap.md, paddingHorizontal: Pad.sm }}>
            {opcionesEquipos.map((n) => (
              <TouchableOpacity
                key={n}
                activeOpacity={0.7}
                onPress={() => elegirCantidad(n)}
                disabled={generateRondasIsPending}
                style={{
                  width: 80, height: 80, borderRadius: 16,
                  backgroundColor: Palette.cyan,
                  alignItems: "center", justifyContent: "center",
                  opacity: generateRondasIsPending ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 28, fontFamily: Fonts.displayBold, color: Palette.black }}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={{ paddingVertical: Pad.sm }}>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {paso === "siembra" ? (
        <View style={{ gap: Gap.md }}>
          {siembras.map((siembra) => {
            const info = SIEMBRA_INFO[siembra]
            const esDefecto = siembra === siembraPorDefecto
            return (
              <TouchableOpacity
                key={siembra}
                activeOpacity={0.7}
                onPress={() => elegirSiembra(siembra)}
                disabled={generateRondasIsPending}
                style={{
                  flexDirection: "row", alignItems: "center", gap: Gap.md,
                  backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base,
                  borderWidth: 1, borderColor: esDefecto ? Palette.cyan : Palette.border,
                  opacity: generateRondasIsPending ? 0.6 : 1,
                }}
              >
                <MaterialIcons name={info.icono} size={22} color={Palette.cyan} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>{info.titulo}</Text>
                  <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>{info.detalle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity onPress={() => setPaso("cantidad")} style={{ paddingVertical: Pad.sm, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Atrás</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Sin ScrollView propio: la hoja ya trae el suyo y anidarlos rompe el gesto. */}
      {paso === "llaves" && picking ? (
        <View style={{ gap: Gap.sm, paddingBottom: Pad.xl }}>
          {availableTeamsForPair(equipos, pairs, picking.index, picking.side).map((equipo) => (
            <TouchableOpacity
              key={equipo.id}
              activeOpacity={0.7}
              onPress={() => asignar(equipo.id)}
              style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, padding: Pad.base, borderWidth: 1, borderColor: Palette.border }}
            >
              <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.sans }}>{nombreDe(equipo.id) ?? equipo.id}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setPicking(null)} style={{ paddingVertical: Pad.sm, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {paso === "llaves" && !picking ? (
        <View style={{ gap: Gap.md, paddingBottom: Pad.xl }}>
          {pairs.map((pair, index) => (
            <View key={index} style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.sm, borderWidth: 1, borderColor: Palette.border }}>
              <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.semiBold }}>Cruce {index + 1}</Text>
              {(["local", "visitante"] as const).map((side) => {
                const nombre = nombreDe(side === "local" ? pair.equipoLocalId : pair.equipoVisitanteId)
                return (
                  <TouchableOpacity
                    key={side}
                    activeOpacity={0.7}
                    onPress={() => setPicking({ index, side })}
                    style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingVertical: Pad.sm }}
                  >
                    <MaterialIcons name="groups" size={18} color={Palette.cyan} />
                    <Text style={{ flex: 1, color: nombre ? Palette.text : Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans }}>
                      {nombre ?? (side === "local" ? "Elegir local" : "Elegir visitante")}
                    </Text>
                    <MaterialIcons name="chevron-right" size={18} color={Palette.textMuted} />
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
          {error ? (
            <Text style={{ color: Palette.danger, fontSize: 12, fontFamily: Fonts.sans, textAlign: "center" }}>{error}</Text>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={confirmarManual}
            disabled={!!error || generateRondasIsPending}
            style={{ backgroundColor: error ? Palette.dark60 : Palette.cyan, borderRadius: Radius.md, padding: Pad.md, alignItems: "center", opacity: generateRondasIsPending ? 0.6 : 1 }}
          >
            <Text style={{ color: error ? Palette.textMuted : Palette.black, fontSize: 14, fontFamily: Fonts.semiBold }}>Generar eliminatorias</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPaso("siembra")} style={{ paddingVertical: Pad.sm, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Atrás</Text>
          </TouchableOpacity>
        </View>
      ) : null}

    </AppBottomSheetModal>
  )
}
