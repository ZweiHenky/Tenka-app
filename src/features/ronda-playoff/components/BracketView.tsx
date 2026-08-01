import { useMemo } from "react"
import { View, Text, ScrollView } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Radius, Gap, Palette, Fonts } from "@/constants/theme"

export interface BracketMatchData {
  id: string
  localNombre: string | null
  visitanteNombre: string | null
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  estado: string | null
  isPlaceholder: boolean
}

export interface BracketRoundData {
  nombre: string
  matches: BracketMatchData[]
}

interface Props {
  rounds: BracketRoundData[]
}

const MATCH_W = 164
const MATCH_H = 52
const GAP_V = 12
const GAP_H = 44
const HEADER_H = 28
const PAD_T = 8
const PAD_B = 12
const PAD_L = 12
const PAD_R = 12
const UNIT = MATCH_H + GAP_V

function getMatchY(roundIndex: number, matchIndex: number): number {
  if (roundIndex === 0) return matchIndex * UNIT
  const block = Math.pow(2, roundIndex)
  const first = matchIndex * block
  const last = (matchIndex + 1) * block - 1
  const firstCenter = first * UNIT + MATCH_H / 2
  const lastCenter = last * UNIT + MATCH_H / 2
  return (firstCenter + lastCenter) / 2 - MATCH_H / 2
}

function getCenterY(roundIndex: number, matchIndex: number): number {
  return getMatchY(roundIndex, matchIndex) + MATCH_H / 2
}

export default function BracketView({ rounds }: Props) {
  const firstCount = rounds[0]?.matches.length ?? 0

  const totalWidth = PAD_L + rounds.length * MATCH_W + (rounds.length - 1) * GAP_H + PAD_R
  const contentHeight = firstCount * UNIT - GAP_V
  const bracketHeight = PAD_T + HEADER_H + contentHeight + PAD_B

  const connectors = useMemo(() => {
    const els: React.ReactNode[] = []
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const nextCount = rounds[ri + 1].matches.length
      for (let mi = 0; mi < nextCount; mi++) {
        const top = mi * 2
        const bot = mi * 2 + 1
        if (bot >= rounds[ri].matches.length) continue

        const yA = getCenterY(ri, top)
        const yB = getCenterY(ri, bot)
        const yMid = (yA + yB) / 2
        const xStart = PAD_L + (ri + 1) * MATCH_W + ri * GAP_H
        const xEnd = PAD_L + (ri + 1) * (MATCH_W + GAP_H)
        const xVert = (xStart + xEnd) / 2
        const offY = HEADER_H + PAD_T

        els.push(
          <View key={`c-hA-${ri}-${mi}`} style={{ position: "absolute", left: xStart, top: yA - 1 + offY, width: xVert - xStart, height: 2, backgroundColor: Palette.cyan }} />,
          <View key={`c-hB-${ri}-${mi}`} style={{ position: "absolute", left: xStart, top: yB - 1 + offY, width: xVert - xStart, height: 2, backgroundColor: Palette.cyan }} />,
          <View key={`c-v-${ri}-${mi}`} style={{ position: "absolute", left: xVert - 1, top: yA + offY, width: 2, height: yB - yA, backgroundColor: Palette.cyan }} />,
          <View key={`c-hM-${ri}-${mi}`} style={{ position: "absolute", left: xVert + 1, top: yMid - 1 + offY, width: xEnd - xVert, height: 2, backgroundColor: Palette.cyan }} />,
        )
      }
    }
    return els
  }, [rounds])

  if (rounds.length === 0) return null

  return (
    <View style={{ marginTop: Gap.md, backgroundColor: Palette.surface, borderRadius: Radius.md, overflow: "hidden", borderWidth: 1, borderColor: Palette.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.cyan10, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Palette.border }}>
        <MaterialIcons name="emoji-events" size={16} color={Palette.cyan} style={{ marginRight: 6 }} />
        <Text style={{ fontSize: 13, fontFamily: Fonts.display, color: Palette.text }}>Llaves</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: PAD_T }}>
        <View style={{ width: totalWidth, height: bracketHeight, position: "relative" }}>
          {rounds.map((r, ri) => (
            <View key={`h-${ri}`} style={{ position: "absolute", left: PAD_L + ri * (MATCH_W + GAP_H), top: 0, width: MATCH_W, height: HEADER_H, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.cyan }}>{r.nombre}</Text>
            </View>
          ))}

          {rounds.map((r, ri) =>
            r.matches.map((m, mi) => {
              const y = getMatchY(ri, mi) + HEADER_H
              const x = PAD_L + ri * (MATCH_W + GAP_H)

              if (m.isPlaceholder) {
                return (
                  <View key={`m-${ri}-${mi}`} style={{ position: "absolute", left: x, top: y, width: MATCH_W, height: MATCH_H, backgroundColor: Palette.surfaceLight, borderRadius: 6, borderWidth: 1, borderColor: Palette.textMuted, borderStyle: "dashed", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.medium }}>Pendiente</Text>
                  </View>
                )
              }

              const localWon = m.estado === "FINALIZADO" && (
                m.golesLocal > m.golesVisitante ||
                (m.golesLocal === m.golesVisitante && m.penalesLocal != null && m.penalesLocal > (m.penalesVisitante ?? 0))
              )
              const visitWon = m.estado === "FINALIZADO" && (
                m.golesVisitante > m.golesLocal ||
                (m.golesLocal === m.golesVisitante && m.penalesVisitante != null && m.penalesVisitante > (m.penalesLocal ?? 0))
              )
              const finished = m.estado === "FINALIZADO"

              return (
                <View key={m.id} style={{ position: "absolute", left: x, top: y, width: MATCH_W, height: MATCH_H, backgroundColor: Palette.surfaceLight, borderRadius: 6, overflow: "hidden" }}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontFamily: localWon ? Fonts.semiBold : Fonts.medium, color: localWon ? Palette.success : (finished ? Palette.textMuted : Palette.text), marginBottom: 2 }} numberOfLines={1}>{m.localNombre ?? "?"}</Text>
                      <View style={{ height: 1, backgroundColor: Palette.border }} />
                      <Text style={{ fontSize: 11, fontFamily: visitWon ? Fonts.semiBold : Fonts.medium, color: visitWon ? Palette.success : (finished ? Palette.textMuted : Palette.textSecondary) }} numberOfLines={1}>{m.visitanteNombre ?? "?"}</Text>
                    </View>
                    <View style={{ width: 36, alignItems: "center" }}>
                      {finished ? (
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 14, fontFamily: Fonts.displayBold, color: localWon ? Palette.success : Palette.textSecondary }}>{m.golesLocal}</Text>
                          <Text style={{ fontSize: 14, fontFamily: Fonts.displayBold, color: visitWon ? Palette.success : Palette.textSecondary }}>{m.golesVisitante}</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.textMuted }}>VS</Text>
                      )}
                    </View>
                  </View>
                </View>
              )
            })
          )}

          {connectors}
        </View>
      </ScrollView>
    </View>
  )
}
