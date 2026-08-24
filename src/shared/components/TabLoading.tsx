import { ActivityIndicator, Text, View } from "react-native"
import { Fonts, Gap, Palette } from "@/constants/theme"

interface Props {
  /** El rótulo de la pestaña, tal cual se ve en el TabBar. */
  nombre: string
}

/**
 * La carga de una pestaña, igual en todas.
 *
 * Antes cada una resolvía lo suyo: Equipos y Jornadas no mostraban nada, Posiciones un texto plano
 * pegado a la izquierda, Goleo un spinner, y Eliminatorias el `LoadingScreen` de pantalla completa
 * —fondo negro incluido— dentro del hueco de una pestaña.
 *
 * No sustituye a `LoadingScreen`: ese sigue siendo el de la pantalla entera. Este llena el hueco de
 * una pestaña, y por eso lleva `minHeight` en vez de `flex: 1` — sin una altura de referencia el
 * bloque colapsa y el layout salta cuando llega el contenido.
 */
export default function TabLoading({ nombre }: Props) {
  return (
    <View style={{ minHeight: 200, alignItems: "center", justifyContent: "center", gap: Gap.md }}>
      <ActivityIndicator size="large" color={Palette.cyan} />
      <Text style={{ color: Palette.textSecondary, fontSize: 14, fontFamily: Fonts.sans }}>
        Cargando {nombre.toLowerCase()}…
      </Text>
    </View>
  )
}
