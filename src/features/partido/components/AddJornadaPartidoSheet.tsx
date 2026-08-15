import { useMemo, useRef, useState } from "react"
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { SelectField } from "@/shared/components/SelectField"
import { useToast } from "@/shared/components/Toast"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { useCreateJornadaPartido, useJornadaPartidoOptions } from "../hooks/usePartidos"

interface Props {
  visible: boolean
  jornadaId: string
  divisionId: string
  leagueId: string
  onClose: () => void
}

const buttonStyle = { paddingVertical: Pad.md, paddingHorizontal: Pad.base, borderRadius: Radius.md, alignItems: "center" as const }

function dateName(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "short" }).format(date)
}

export default function AddJornadaPartidoSheet({ visible, jornadaId, divisionId, leagueId, onClose }: Props) {
  const toast = useToast()
  const optionsQuery = useJornadaPartidoOptions(jornadaId, visible)
  const createPartido = useCreateJornadaPartido()
  const [localOverride, setLocalOverride] = useState<string | null>(null)
  const [visitanteOverride, setVisitanteOverride] = useState<string | null>(null)
  const [dateKey, setDateKey] = useState("")
  const [timeKey, setTimeKey] = useState("")
  const [courtKey, setCourtKey] = useState("")
  const [manualSelection, setManualSelection] = useState(false)
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null)
  const options = optionsQuery.data
  const tipo: "REGULAR" | "COMPLEMENTO" = options?.recomendacion === "COMPLEMENTO" ? "COMPLEMENTO" : "REGULAR"
  const localId = localOverride ?? (manualSelection ? "" : options?.localSugeridoId ?? "")
  const visitanteId = visitanteOverride ?? (manualSelection ? "" : options?.visitanteSugeridoId ?? "")

  const localOptions = tipo === "COMPLEMENTO" ? options?.pendientes ?? [] : options?.equipos ?? []
  const visitorOptions = useMemo(() => options?.equipos.filter((team) => team.id !== localId) ?? [], [options, localId])
  const slots = options?.slots ?? []
  const isTeamFree = (slot: (typeof slots)[number]) => !slot.equiposOcupados.includes(localId) && !slot.equiposOcupados.includes(visitanteId)
  const dates = [...new Set(slots.map((slot) => slot.fecha))]
  const dateOptions = dates.map((date) => {
    const daySlots = slots.filter((slot) => slot.fecha === date)
    const available = daySlots.some((slot) => slot.canchaDisponible && isTeamFree(slot))
    return { id: date, nombre: dateName(date), disabled: !available, description: available ? undefined : "Sin horarios disponibles" }
  })
  const validDateKey = dateOptions.some((option) => option.id === dateKey && !option.disabled) ? dateKey : ""
  const daySlots = slots.filter((slot) => slot.fecha === validDateKey)
  const times = [...new Set(daySlots.map((slot) => slot.horaInicio))]
  const timeOptions = times.map((time) => {
    const hourSlots = daySlots.filter((slot) => slot.horaInicio === time)
    const available = hourSlots.some((slot) => slot.canchaDisponible && isTeamFree(slot))
    return { id: time, nombre: `${time} - ${hourSlots[0].horaFin}`, disabled: !available, description: available ? undefined : "Cancha o equipos ocupados" }
  })
  const validTimeKey = timeOptions.some((option) => option.id === timeKey && !option.disabled) ? timeKey : ""
  const hourSlots = daySlots.filter((slot) => slot.horaInicio === validTimeKey)
  const courtOptions = hourSlots.map((slot) => {
    const available = slot.canchaDisponible && isTeamFree(slot)
    return { id: slot.id, nombre: slot.canchaNombre ?? "Cancha única", disabled: !available, description: available ? undefined : !slot.canchaDisponible ? "Cancha ocupada" : "Uno de los equipos está ocupado" }
  })
  const validCourtKey = courtOptions.some((option) => option.id === courtKey && !option.disabled) ? courtKey : ""
  const singleCourt = slots.length > 0 && slots.every((slot) => slot.canchaId === null && slot.canchaNombre === null)
  const selectedSlot = singleCourt
    ? hourSlots.find((slot) => slot.canchaDisponible && isTeamFree(slot))
    : hourSlots.find((slot) => slot.id === validCourtKey)

  const handleManualSelection = () => {
    setManualSelection(true)
    setLocalOverride("")
    setVisitanteOverride("")
    setDateKey("")
    setTimeKey("")
    setCourtKey("")
  }

  const handleSubmit = async () => {
    const slot = selectedSlot
    if (!localId || !visitanteId || !slot) {
      toast.info("Selecciona ambos equipos y un horario disponible")
      return
    }
    const data = { equipoLocalId: localId, equipoVisitanteId: visitanteId, tipoPartido: tipo, fecha: slot.fecha, horaInicio: slot.horaInicio, horaFin: slot.horaFin, canchaId: slot.canchaId }
    const fingerprint = JSON.stringify(data)
    if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
      attemptRef.current = { fingerprint, key: `partido:${jornadaId}:${slot.id}:${localId}:${visitanteId}` }
    }
    try {
      await createPartido.mutateAsync({ jornadaId, divisionId, leagueId, idempotencyKey: attemptRef.current.key, data })
      toast.success("Partido agregado a la jornada")
      attemptRef.current = null
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el partido")
      await optionsQuery.refetch()
    }
  }

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} title="Agregar partido" snapPoints={["85%"]} dismissible={!createPartido.isPending}>
      {optionsQuery.isLoading ? <ActivityIndicator color={Palette.cyan} /> : optionsQuery.error ? (
        <View style={{ gap: Gap.md }}>
          <Text style={{ color: Palette.textSecondary }}>{optionsQuery.error.message}</Text>
          <TouchableOpacity onPress={() => optionsQuery.refetch()} style={[buttonStyle, { backgroundColor: Palette.cyan }]}>
            <Text style={{ color: Palette.black, fontFamily: Fonts.semiBold }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : options?.recomendacion === "MANUAL" ? (
        <View style={{ padding: Pad.base, borderRadius: Radius.md, backgroundColor: Palette.warning10, gap: Gap.sm }}>
          <Text style={{ color: Palette.warning, fontFamily: Fonts.semiBold }}>No se detectó un caso compatible</Text>
          <Text style={{ color: Palette.textSecondary }}>Esta función requiere uno o dos equipos pendientes en la jornada.</Text>
        </View>
      ) : options ? (
        <>
          <View style={{ padding: Pad.base, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.borderActive, backgroundColor: Palette.cyan10, gap: Gap.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <MaterialIcons name="auto-awesome" size={20} color={Palette.cyan} />
              <Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold }}>
                {tipo === "REGULAR" ? "Cruce regular recomendado" : "Partido de complemento"}
              </Text>
            </View>
            <Text style={{ color: Palette.text }}>
              {tipo === "REGULAR"
                ? `${options.pendientes[0]?.nombre} vs ${options.pendientes[1]?.nombre}`
                : `${options.pendientes[0]?.nombre} será local y sumará puntos; el rival no volverá a sumar.`}
            </Text>
            {tipo === "REGULAR" && !manualSelection ? (
              <TouchableOpacity onPress={handleManualSelection}>
                <Text style={{ color: Palette.textSecondary, textDecorationLine: "underline" }}>No usar este cruce, elegir otros equipos</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <SelectField label="Equipo local" current={localId} options={localOptions} onSelect={(id) => { setLocalOverride(id); if (visitanteId === id) setVisitanteOverride(""); setTimeKey(""); setCourtKey("") }} />
          <SelectField label="Equipo visitante" current={visitanteId} options={visitorOptions} onSelect={(id) => { setVisitanteOverride(id); setTimeKey(""); setCourtKey("") }} />
          <SelectField label="Fecha" current={validDateKey} options={dateOptions} onSelect={(id) => { setDateKey(id); setTimeKey(""); setCourtKey("") }} />
          <SelectField label="Hora" current={validTimeKey} options={timeOptions} onSelect={(id) => { setTimeKey(id); setCourtKey("") }} />
          {!singleCourt ? <SelectField label="Cancha" current={validCourtKey} options={courtOptions} onSelect={setCourtKey} /> : null}
          {localId && visitanteId && dateOptions.every((option) => option.disabled) ? <Text style={{ color: Palette.warning }}>No quedan horarios donde ambos equipos estén libres.</Text> : null}

          {selectedSlot ? (
            <View style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.base, gap: Gap.micro }}>
              <Text style={{ color: Palette.textMuted, fontSize: 12, fontFamily: Fonts.semiBold }}>Confirmar programación</Text>
              <Text style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>{dateName(selectedSlot.fecha)}</Text>
              <Text style={{ color: Palette.textSecondary }}>{selectedSlot.horaInicio} - {selectedSlot.horaFin}{selectedSlot.canchaNombre ? ` · ${selectedSlot.canchaNombre}` : ""}</Text>
            </View>
          ) : null}

          <TouchableOpacity disabled={createPartido.isPending || !selectedSlot} onPress={handleSubmit} style={[buttonStyle, { backgroundColor: selectedSlot ? Palette.cyan : Palette.surfaceLight, opacity: createPartido.isPending ? 0.7 : 1 }]}> 
            {createPartido.isPending ? <ActivityIndicator color={Palette.black} /> : <Text style={{ color: selectedSlot ? Palette.black : Palette.textMuted, fontFamily: Fonts.semiBold }}>Confirmar partido</Text>}
          </TouchableOpacity>
        </>
      ) : null}
    </AppBottomSheetModal>
  )
}
