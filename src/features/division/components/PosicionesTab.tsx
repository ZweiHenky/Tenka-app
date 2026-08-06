import { View, Text, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Pad, Gap, Fonts, Radius } from "@/constants/theme"
import StandingsTable from "@/features/tabla-posicion/components/StandingsTable"
import { downloadPdf, standingsHtml } from "@/shared/utils/print-pdf"
import { useToast } from "@/shared/components/Toast"

interface Props {
  divisionNombre: string
  standings: any[]
  standingsLoading: boolean
}

export default function PosicionesTab({ divisionNombre, standings, standingsLoading }: Props) {
  const toast = useToast()

  return (
    <View style={{ gap: Gap.md }}>
      <StandingsTable rows={standings} isLoading={standingsLoading} />
      {standings.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={async () => {
            try {
              const rows = standings.map((r, i) => ({
                pos: i + 1,
                equipo: r.equipo?.nombre ?? "—",
                pj: r.partidosJugados,
                g: r.ganados,
                e: r.empatados,
                p: r.perdidos,
                gf: r.golesFavor,
                gc: r.golesContra,
                pts: r.puntos,
              }))
              const html = standingsHtml(divisionNombre, rows)
              await downloadPdf(html, `Tabla-${divisionNombre}.pdf`)
            } catch {
              toast.error("Error al generar PDF")
            }
          }}
          style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: Gap.sm }}
        >
          <MaterialIcons name="picture-as-pdf" size={20} color={Palette.dark} />
          <Text style={{ color: Palette.dark, fontSize: 15, fontFamily: Fonts.semiBold }}>Descargar PDF</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}
