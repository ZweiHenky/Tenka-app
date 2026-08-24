import { useState } from "react"
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Fonts, Gap, Pad, Radius } from "@/constants/theme"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import LogoImage from "@/shared/components/LogoImage"
import type { GoleadorRow } from "@/features/goleador/api/goleadores"
import { campeonSugerido, conSugeridoPrimero, goleadorSugerido, type RondaDeCuadro } from "@/features/division/utils/campeon"

export interface CampeonEquipo {
  id: string
  nombre: string
  logo?: string | null
}

interface Props {
  visible: boolean
  onClose: () => void
  equipos: CampeonEquipo[]
  rondas: RondaDeCuadro[]
  goleadores: GoleadorRow[]
  goleadoresLoading: boolean
  isPending: boolean
  onSelect: (equipoId: string, jugadorId: string | null) => void
}

type Paso = "equipo" | "goleo"

function ChipSugerido() {
  return (
    <View style={{ backgroundColor: Palette.warning10, borderRadius: Radius.full, paddingHorizontal: Pad.sm, paddingVertical: Pad.micro }}>
      <Text style={{ color: Palette.warning, fontSize: 10, fontFamily: Fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5 }}>Sugerido</Text>
    </View>
  )
}

export default function CampeonSelectorModal({ visible, onClose, equipos, rondas, goleadores, goleadoresLoading, isPending, onSelect }: Props) {
  const [paso, setPaso] = useState<Paso>("equipo")
  const [equipoId, setEquipoId] = useState<string | null>(null)

  const sugerencia = campeonSugerido(rondas)
  const lider = goleadorSugerido(goleadores)
  // El sugerido arriba: con veinte equipos podía quedar al final y había que buscarlo.
  const equiposOrdenados = conSugeridoPrimero(equipos, sugerencia?.equipoId)
  // Los goles sin jugador vivo no se pueden premiar: el servidor los rechaza.
  const premiables = goleadores.filter((row) => row.jugadorId != null)
  // Sin tabla de goleo no hay a quién premiar, así que ese paso ni se ofrece.
  const hayGoleo = premiables.length > 0

  // Con la tabla todavía en vuelo, `premiables` está vacío y el paso de goleo se saltaría
  // creyendo que no hay a quién premiar. Por eso los equipos no se pueden tocar hasta que llegue.
  const elegirEquipo = (id: string) => {
    if (goleadoresLoading) return
    if (!hayGoleo) return onSelect(id, null)
    setEquipoId(id)
    setPaso("goleo")
  }
  const bloqueado = isPending || goleadoresLoading

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={paso === "equipo" ? "¿Quién es el campeón?" : "¿Y el campeón de goleo?"}
      snapPoints={["80%"]}
    >
      {/* Sin ScrollView propio: la hoja ya trae el suyo y anidarlos rompe el gesto. */}
      {paso === "equipo" ? (
        <View style={{ gap: Gap.sm, paddingBottom: Pad.xl }}>
          {goleadoresLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Gap.sm, paddingVertical: Pad.sm }}>
              <ActivityIndicator color={Palette.cyan} />
              <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>Revisando la tabla de goleo...</Text>
            </View>
          ) : null}
          {equiposOrdenados.map((equipo) => {
            const esSugerido = equipo.id === sugerencia?.equipoId
            return (
              <TouchableOpacity
                key={equipo.id}
                activeOpacity={0.7}
                onPress={() => elegirEquipo(equipo.id)}
                disabled={bloqueado}
                style={{
                  flexDirection: "row", alignItems: "center", gap: Gap.md,
                  backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base,
                  borderWidth: 1, borderColor: esSugerido ? Palette.warning : Palette.border,
                  opacity: bloqueado ? 0.6 : 1,
                }}
              >
                <LogoImage uri={equipo.logo} size={36} backgroundColor={Palette.surface} />
                <Text style={{ flex: 1, color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }} numberOfLines={1}>{equipo.nombre}</Text>
                {esSugerido ? <ChipSugerido /> : null}
                <MaterialIcons name="chevron-right" size={20} color={Palette.textMuted} />
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity onPress={onClose} style={{ paddingVertical: Pad.sm, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {paso === "goleo" ? (
        <View style={{ gap: Gap.sm, paddingBottom: Pad.xl }}>
          {premiables.map((row) => {
            const esSugerido = row.jugadorId === lider?.jugadorId
            return (
              <TouchableOpacity
                key={row.jugadorId}
                activeOpacity={0.7}
                onPress={() => onSelect(equipoId!, row.jugadorId)}
                disabled={isPending}
                style={{
                  flexDirection: "row", alignItems: "center", gap: Gap.md,
                  backgroundColor: Palette.surfaceLight, borderRadius: Radius.lg, padding: Pad.base,
                  borderWidth: 1, borderColor: esSugerido ? Palette.warning : Palette.border,
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                <Image
                  source={row.foto ? { uri: row.foto } : require("@/assets/ejemplos/logo.png")}
                  style={{ width: 36, height: 36, borderRadius: Radius.full }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }} numberOfLines={1}>{row.nombre}</Text>
                  <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 }}>{row.goles} {row.goles === 1 ? "gol" : "goles"}</Text>
                </View>
                {esSugerido ? <ChipSugerido /> : null}
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity
            onPress={() => onSelect(equipoId!, null)}
            disabled={isPending}
            style={{ paddingVertical: Pad.md, alignItems: "center", opacity: isPending ? 0.6 : 1 }}
          >
            <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 14 }}>Omitir y guardar solo el campeón</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPaso("equipo")} style={{ paddingVertical: Pad.sm, alignItems: "center" }}>
            <Text style={{ color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 14 }}>Atrás</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </AppBottomSheetModal>
  )
}
