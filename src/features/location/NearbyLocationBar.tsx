import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import type { NearbyLocationStatus } from "./useNearbyLocation"

interface Props {
  status: NearbyLocationStatus
  label?: string
  onActivate: () => void
  onRefresh: () => void
}

function content(status: NearbyLocationStatus, label?: string) {
  switch (status) {
    case "ready": return { title: label ? `Cerca de ${label}` : "Tu ubicación actual", detail: "Toca para actualizar", icon: "refresh" as const, active: true }
    case "checking":
    case "locating": return { title: "Obteniendo ubicación", detail: "El feed sigue disponible", loading: true }
    case "denied": return { title: "Usar mi ubicación", detail: "Permiso no concedido", icon: "chevron-right" as const }
    case "blocked": return { title: "Activa la ubicación", detail: "Abre la configuración del sistema", icon: "open-in-new" as const }
    case "web-blocked": return { title: "Ubicación bloqueada", detail: "Habilítala en los permisos del sitio" }
    case "services-disabled": return { title: "Ubicación desactivada", detail: "Activa el GPS y vuelve a intentarlo", icon: "refresh" as const }
    case "error": return { title: "No pudimos localizarte", detail: "Toca para reintentar", icon: "refresh" as const }
    case "disabled": return { title: "Ligas cerca de ti", detail: "Usa tu ubicación para mostrar primero las más cercanas", action: "Activar" }
    default: return { title: "Ligas cerca de ti", detail: "Usa tu ubicación para mostrar primero las más cercanas", action: "Activar" }
  }
}

export default function NearbyLocationBar({ status, label, onActivate, onRefresh }: Props) {
  const state = content(status, label)
  const busy = status === "checking" || status === "locating"
  const disabled = busy || status === "web-blocked"
  const handlePress = status === "ready" ? onRefresh : onActivate

  return (
    <TouchableOpacity disabled={disabled} onPress={handlePress} activeOpacity={0.75}>
      <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: Gap.md, paddingHorizontal: Pad.base, paddingVertical: Pad.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: state.active ? Palette.cyan : Palette.border, backgroundColor: state.active ? Palette.cyan10 : Palette.surface }}>
        <View style={{ width: 32, height: 32, borderRadius: Radius.full, alignItems: "center", justifyContent: "center", backgroundColor: state.active ? Palette.cyan20 : Palette.surfaceLight }}>
          {state.loading
            ? <ActivityIndicator size="small" color={Palette.cyan} />
            : <MaterialIcons name={state.active ? "my-location" : "location-on"} size={17} color={Palette.cyan} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: Palette.text, fontSize: 13, fontFamily: Fonts.semiBold }}>{state.title}</Text>
          <Text numberOfLines={2} style={{ color: Palette.textMuted, fontSize: 11, fontFamily: Fonts.sans }}>{state.detail}</Text>
        </View>
        {state.action ? <Text style={{ color: Palette.cyan, fontSize: 12, fontFamily: Fonts.semiBold }}>{state.action}</Text> : null}
        {state.icon ? <MaterialIcons name={state.icon} size={19} color={Palette.cyan} /> : null}
      </View>
    </TouchableOpacity>
  )
}
