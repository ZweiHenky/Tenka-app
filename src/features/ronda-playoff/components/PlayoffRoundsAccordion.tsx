import { useMemo, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import PartidoCard from "@/features/jornada/components/PartidoCard"
import type { PartidoResponse } from "@/features/partido/api/partidos"
import type { RondaPlayoff } from "@/features/ronda-playoff/api/rondasPlayoff"

interface Props {
  rondas: RondaPlayoff[]
  onPartidoPress: (partido: PartidoResponse) => void
}

export default function PlayoffRoundsAccordion({ rondas, onPartidoPress }: Props) {
  const sortedRondas = useMemo(() => [...rondas].sort((a, b) => a.orden - b.orden), [rondas])
  const [selectedRondaId, setSelectedRondaId] = useState<string | null | undefined>(undefined)

  const partidosPorRonda = useMemo(() => {
    const map = new Map<string, PartidoResponse[]>()
    for (const ronda of sortedRondas) map.set(ronda.id, ronda.partidos)
    return map
  }, [sortedRondas])

  const defaultRondaId = useMemo(() => {
    const active = sortedRondas.find((ronda) => {
      const partidos = partidosPorRonda.get(ronda.id) ?? []
      return partidos.some(
        (partido) => partido.estado !== "FINALIZADO" && partido.equipoLocalId && partido.equipoVisitanteId,
      )
    })
    return active?.id ?? sortedRondas.at(-1)?.id ?? null
  }, [partidosPorRonda, sortedRondas])
  const expandedRondaId = selectedRondaId === undefined ? defaultRondaId : selectedRondaId

  return (
    <View style={{ gap: Gap.sm }}>
      {sortedRondas.map((ronda) => {
        const partidos = partidosPorRonda.get(ronda.id) ?? []
        const finalizados = partidos.filter((partido) => partido.estado === "FINALIZADO").length
        const expanded = expandedRondaId === ronda.id

        return (
          <View
            key={ronda.id}
            style={{
              backgroundColor: Palette.surface,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: expanded ? Palette.playoff : Palette.border,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setSelectedRondaId(expanded ? null : ronda.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${ronda.nombre}, ${finalizados} de ${partidos.length} partidos finalizados`}
              style={{
                minHeight: 58,
                flexDirection: "row",
                alignItems: "center",
                gap: Gap.sm,
                paddingHorizontal: Pad.base,
                paddingVertical: Pad.md,
                backgroundColor: expanded ? Palette.playoff10 : Palette.surfaceLight,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", backgroundColor: Palette.playoff10 }}>
                <MaterialIcons name="emoji-events" size={19} color={Palette.playoff} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.bold }}>{ronda.nombre}</Text>
                <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>
                  {partidos.length === 0 ? "Sin partidos" : `${finalizados} de ${partidos.length} finalizados`}
                </Text>
              </View>
              <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={24} color={expanded ? Palette.playoff : Palette.textMuted} />
            </TouchableOpacity>

            {expanded ? (
              <View style={{ padding: Pad.md, gap: Gap.sm, borderTopWidth: 1, borderTopColor: Palette.border }}>
                {partidos.length === 0 ? (
                  <View style={{ paddingVertical: Pad.base, alignItems: "center", gap: Gap.sm }}>
                    <MaterialIcons name="sports-soccer" size={24} color={Palette.textMuted} />
                    <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.sans }}>Sin partidos en esta ronda</Text>
                  </View>
                ) : (
                  partidos.map((partido) => (
                    <PartidoCard key={partido.id} partido={partido} onPress={() => onPartidoPress(partido)} />
                  ))
                )}
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
