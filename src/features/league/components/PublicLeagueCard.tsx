import { useCallback, useMemo, useRef, useState } from "react"
import { View, Text, TouchableOpacity, Image, Linking } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import LogoImage from "@/shared/components/LogoImage"
import type { PublicLeagueListDto } from "@/features/league/api/leagues"
import { useLigaFavoritaStore } from "@/stores/ligaFavoritaStore"
import { parseTimeRanges } from "@/shared/utils/time-range"
import { formatDiasCortos } from "@/features/division/utils/divisionDays"
import CourtSchedulePicker from "@/features/division/components/CourtSchedulePicker"
import { courtScheduleLines, selectedCourtSchedule } from "@/features/division/utils/court-schedule-selection"
import { divisionLabel } from "@/features/division/utils/division-label"

interface Props {
  league: PublicLeagueListDto
  ubicacionTexto?: string
}

function colorEstado(nombre: string): string {
  switch (nombre) {
    case "ABIERTA": return Palette.warning
    case "EN CURSO": return Palette.success
    case "FINALIZADO": return Palette.cyan
    default: return Palette.textMuted
  }
}

export default function PublicLeagueCard({ league: l, ubicacionTexto }: Props) {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const [selectedCancha, setSelectedCancha] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const rangePickerRef = useRef<BottomSheetModal>(null)
  const snapPoints = useMemo(() => ["50%"], [])
  const toggleFav = useLigaFavoritaStore((s) => s.toggle)
  const esFav = useLigaFavoritaStore((s) => s.esFavorito(l.id))

  const current = l.divisiones && l.divisiones.length > 0
    ? (selectedDivision ? l.divisiones.find((d) => d.id === selectedDivision) ?? l.divisiones[0] : l.divisiones[0])
    : null

  // Los escalares de la división son la **unión** de sus canchas; el selector permite bajar a una.
  const porCancha = courtScheduleLines(current?.canchaHorarios)
  const horario = selectedCourtSchedule(porCancha, current ?? { diasPartido: null, horarioPartido: null }, selectedCancha)
  const ranges = parseTimeRanges(horario.horarioPartido ?? "")

  const insets = useSafeAreaInsets()

  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  ), [])

  const selectDivision = (id: string) => {
    setSelectedDivision(id)
    // Sin esto quedaría elegida una cancha de la división anterior.
    setSelectedCancha(null)
    setPickerOpen(false)
  }

  const handleNav = () => router.push({ pathname: "/(drawer)/(public)/liga/[id]", params: { id: l.id } })

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handleNav} style={{ borderRadius: Radius.lg, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 6 }}>
      <View style={{ position: "relative", overflow: "hidden", borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg }}>
        <Image source={l.cancha ? { uri: l.cancha } : require("@/assets/ejemplos/cancha.png")} style={{ width: "100%", height: 160 }} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.20)", "rgba(0,0,0,0.90)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: Pad.base, justifyContent: "flex-end" }}>
          {current?.estadoLiga ? (
            <View style={{ position: "absolute", top: 12, left: 0 }}>
              <View style={{ backgroundColor: colorEstado(current.estadoLiga.nombre.toUpperCase()), paddingHorizontal: 14, paddingVertical: 5, borderTopRightRadius: 6, borderBottomRightRadius: 6, elevation: 4, shadowColor: "#000", shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2 }}>
                <Text style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: Palette.black }}>{current.estadoLiga.nombre}</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderLeftColor: "transparent", borderTopWidth: 6, borderTopColor: "rgba(0,0,0,0.2)" }} />
            </View>
          ) : null}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); toggleFav({ id: l.id, nombre: l.nombre, cancha: l.cancha, logo: l.logo }) }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: "absolute", top: 12, right: 12, zIndex: 20, elevation: 20, width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.dark, borderWidth: 1.5, borderColor: esFav ? Palette.warning : Palette.textMuted, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialIcons name={esFav ? "star" : "star-outline"} size={20} color={esFav ? Palette.warning : Palette.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.base }}>
            <LogoImage uri={l.logo} size={44} ring={Palette.cyan} shadow />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Palette.text, fontSize: 16, fontFamily: Fonts.displayBold }}>{l.nombre}</Text>
              <View style={{ width: 80, height: 1, backgroundColor: Palette.cyan, borderRadius: 1, marginVertical: Gap.sm }} />
              {l.descripcion ? <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans }} numberOfLines={2}>{l.descripcion}</Text> : null}
            </View>
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: Palette.surface, borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg, padding: Pad.base, gap: Gap.md }}>
        {l.divisiones && l.divisiones.length > 0 ? (
          <>
            <Text style={{ fontSize: 11, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Divisiones</Text>
            <View style={{ position: "relative", zIndex: 10 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={(e) => { e.stopPropagation(); setPickerOpen((prev) => !prev) }}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.borderActive, paddingHorizontal: Pad.base, paddingVertical: Pad.md }}
              >
                <Text numberOfLines={1} style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.medium, flex: 1 }}>{current ? divisionLabel(current) : "Seleccionar"}</Text>
                <MaterialIcons name={pickerOpen ? "expand-less" : "expand-more"} size={22} color={Palette.cyan} />
              </TouchableOpacity>

              {pickerOpen ? (
                <View style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: Gap.sm, backgroundColor: Palette.dark, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
                  {l.divisiones.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      activeOpacity={0.7}
                      onPress={(e) => { e.stopPropagation(); selectDivision(d.id) }}
                      style={{ paddingHorizontal: Pad.base, paddingVertical: Pad.lg, backgroundColor: current?.id === d.id ? Palette.cyan10 : "transparent" }}
                    >
                      <Text numberOfLines={1} style={{ color: current?.id === d.id ? Palette.cyan : Palette.text, fontSize: 14, fontFamily: current?.id === d.id ? Fonts.semiBold : Fonts.medium }}>{divisionLabel(d)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {current ? (
              <>
                {/* La categoría no se pierde: sigue en el desplegable de divisiones, arriba. */}
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {current.tipo ? (
                    <View style={{ width: "50%", paddingVertical: Pad.sm, paddingRight: Pad.sm }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                          <MaterialIcons name="sports-soccer" size={14} color={Palette.cyan} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo</Text>
                          <Text numberOfLines={1} style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{current.tipo.nombre}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  {current.tipoCompetencia ? (
                    <View style={{ width: "50%", paddingVertical: Pad.sm, paddingLeft: Pad.sm }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                          <MaterialIcons name="emoji-events" size={14} color={Palette.cyan} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Competencia</Text>
                          <Text numberOfLines={1} style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{current.tipoCompetencia.nombre}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  <View style={{ width: "50%", paddingVertical: Pad.sm, paddingRight: Pad.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="groups" size={14} color={Palette.cyan} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Equipos</Text>
                        <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{current.maxEquipos}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ width: "50%", paddingVertical: Pad.sm, paddingLeft: Pad.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="attach-money" size={14} color={Palette.cyan} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Arbitraje</Text>
                        <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>${current.arbitraje}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <CourtSchedulePicker lines={porCancha} selectedId={selectedCancha} onSelect={setSelectedCancha} />

                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <View style={{ width: "50%", paddingVertical: Pad.sm, paddingRight: Pad.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="calendar-today" size={14} color={Palette.cyan} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Días</Text>
                        <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{horario.diasPartido ? formatDiasCortos(horario.diasPartido) : "-"}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ width: "50%", paddingVertical: Pad.sm, paddingLeft: Pad.sm }}>
                    {ranges.length > 1 ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={(e) => { e.stopPropagation(); rangePickerRef.current?.present() }}
                        style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}
                      >
                        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                          <MaterialIcons name="access-time" size={14} color={Palette.cyan} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Horario</Text>
                          <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }} numberOfLines={1}>{horario.horarioPartido ?? "-"}</Text>
                        </View>
                        <MaterialIcons name="info-outline" size={18} color={Palette.textMuted} />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                          <MaterialIcons name="access-time" size={14} color={Palette.cyan} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 10, color: Palette.textMuted, fontFamily: Fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 }}>Horario</Text>
                          <Text style={{ fontSize: 14, color: Palette.text, fontFamily: Fonts.semiBold }}>{horario.horarioPartido ?? "-"}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </>
            ) : null}
          </>
        ) : (
          <Text style={{ color: Palette.textSecondary, fontSize: 13, fontFamily: Fonts.sans }}>Sin divisiones</Text>
        )}
        {ubicacionTexto ? (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(ubicacionTexto)}`) }}
            style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm, paddingTop: Pad.sm, borderTopWidth: 1, borderTopColor: Palette.border }}
          >
            <MaterialIcons name="location-on" size={16} color={Palette.cyan} />
            <Text style={{ color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans, flex: 1 }} numberOfLines={1}>{ubicacionTexto}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <BottomSheetModal
          ref={rangePickerRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={{ backgroundColor: Palette.borderActive, width: 40, height: 4 }}
          backgroundStyle={{ backgroundColor: Palette.dark, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border }}
        >
          <BottomSheetView style={{ padding: Pad.xl, paddingBottom: insets.bottom + Pad.xl, gap: Gap.sm }}>
            <Text style={{ color: Palette.text, fontSize: 18, fontFamily: Fonts.display }}>Horarios disponibles</Text>
            {ranges.map((r, i) => (
              <View
                key={i}
                style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, paddingVertical: Pad.md, paddingHorizontal: Pad.base, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Palette.cyan10, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="access-time" size={14} color={Palette.cyan} />
                </View>
                <Text style={{ color: Palette.text, fontSize: 15, fontFamily: Fonts.semiBold }}>{r.start} - {r.end}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => rangePickerRef.current?.dismiss()} style={{ marginTop: Gap.sm, paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.cyan, alignItems: "center" }}>
              <Text style={{ color: Palette.black, fontSize: 15, fontFamily: Fonts.semiBold }}>Cerrar</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>
    </TouchableOpacity>
  )
}
