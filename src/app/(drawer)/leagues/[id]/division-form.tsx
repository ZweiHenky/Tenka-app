import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, BackHandler, Switch } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useIsFocused, useLocalSearchParams, router, useNavigation } from "expo-router"
import type { NavigationAction } from "expo-router/build/react-navigation"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useToast } from "@/shared/components/Toast"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useLookups, type Lookups } from "@/features/league/hooks/useLookups"
import { useDivision, useCreateDivision, useUpdateDivision } from "@/features/division/hooks/useDivisions"
import type { CourtScheduleRow, Division, LigaCanchaRef } from "@/domain/interfaces/league"
import { SelectField } from "@/shared/components/SelectField"
import { TimeRangePicker } from "@/shared/components/TimeRangePicker"
import { calculateTimeRangeCapacity, parseTimeRanges, validateTimeRange } from "@/shared/utils/time-range"
import DivisionDaysPicker from "@/features/division/components/DivisionDaysPicker"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"
import ConfirmationModal from "@/shared/components/ConfirmationModal"

interface FormState {
  nombre: string
  maxEquipos: string
  arbitraje: string
  duracionPartido: string
  descanso: string
  categoriaId: string
  tipoId: string
  tipoCompetenciaId: string
  diasPartido: string
  horarioPartido: string
  usarPenalesEnEmpates: boolean
  /** Off = cada cancha define sus propios días y horario. */
  mismoHorarioTodasLasCanchas: boolean
  /** Config por cancha, solo se usa cuando el interruptor está apagado. */
  porCancha: Record<string, CourtFormEntry>
}

interface CourtFormEntry {
  juega: boolean
  diasPartido: string
  horarioPartido: string
}

const EMPTY_COURT_ENTRY: CourtFormEntry = { juega: false, diasPartido: "", horarioPartido: "" }

function normalizeForm(form: FormState) {
  return {
    nombre: form.nombre,
    maxEquipos: form.maxEquipos,
    arbitraje: form.arbitraje,
    duracionPartido: form.duracionPartido,
    descanso: form.descanso,
    categoriaId: form.categoriaId,
    tipoId: form.tipoId,
    tipoCompetenciaId: form.tipoCompetenciaId,
    diasPartido: form.diasPartido,
    horarioPartido: form.horarioPartido,
    usarPenalesEnEmpates: form.usarPenalesEnEmpates,
    mismoHorarioTodasLasCanchas: form.mismoHorarioTodasLasCanchas,
    porCancha: form.porCancha,
  }
}

const EMPTY_FORM: FormState = {
  nombre: "",
  maxEquipos: "",
  arbitraje: "",
  duracionPartido: "",
  descanso: "",
  categoriaId: "",
  tipoId: "",
  tipoCompetenciaId: "",
  diasPartido: "",
  horarioPartido: "",
  usarPenalesEnEmpates: true,
  mismoHorarioTodasLasCanchas: true,
  porCancha: {},
}

function hasValidRanges(value: string): boolean {
  const ranges = parseTimeRanges(value)
  return ranges.length > 0 && ranges.every((r) => /^\d{2}:\d{2}$/.test(r.start) && /^\d{2}:\d{2}$/.test(r.end))
}

interface FormContentProps {
  id: string
  divisionIdParam: string | null
  isEdit: boolean
  division: Division | null
  lookups: Lookups
  canchas: LigaCanchaRef[]
}

function DivisionFormContent({ id, divisionIdParam, isEdit, division, lookups, canchas }: FormContentProps) {
  const toast = useToast()
  const createDivision = useCreateDivision(id)
  const updateDivision = useUpdateDivision(id)

  const [initialForm] = useState<FormState>(() => {
    if (isEdit && division) {
      return {
        nombre: division.nombre,
        maxEquipos: String(division.maxEquipos),
        arbitraje: String(division.arbitraje),
        duracionPartido: division.duracionPartido != null ? String(division.duracionPartido) : "",
        descanso: division.descanso != null ? String(division.descanso) : "",
        categoriaId: division.categoriaId,
        tipoId: division.tipoId,
        tipoCompetenciaId: division.tipoCompetenciaId,
        diasPartido: division.diasPartido || "",
        horarioPartido: division.horarioPartido || "",
        usarPenalesEnEmpates: division.usarPenalesEnEmpates !== false,
        // Rows present = the division was configured court by court.
        mismoHorarioTodasLasCanchas: (division.canchaHorarios ?? []).length === 0,
        porCancha: Object.fromEntries(canchas.map((court) => {
          const row = (division.canchaHorarios ?? []).find((entry) => entry.canchaId === court.id)
          return [court.id, row
            ? { juega: true, diasPartido: row.diasPartido, horarioPartido: row.horarioPartido }
            : { ...EMPTY_COURT_ENTRY }]
        })),
      }
    }
    return {
      ...EMPTY_FORM,
      porCancha: Object.fromEntries(canchas.map((court) => [court.id, { ...EMPTY_COURT_ENTRY }])),
    }
  })

  const [form, setForm] = useState<FormState>(initialForm)

  const perCourtRows = useMemo((): CourtScheduleRow[] => Object.entries(form.porCancha)
    .filter(([, entry]) => entry.juega)
    .map(([canchaId, entry]) => ({ canchaId, diasPartido: entry.diasPartido, horarioPartido: entry.horarioPartido })),
    [form.porCancha])

  const setCourt = useCallback((canchaId: string, patch: Partial<CourtFormEntry>) => {
    setForm((prev) => ({
      ...prev,
      porCancha: {
        ...prev.porCancha,
        [canchaId]: { ...(prev.porCancha[canchaId] ?? EMPTY_COURT_ENTRY), ...patch },
      },
    }))
  }, [])
  const [saving, setSaving] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const navigation = useNavigation()
  const pendingActionRef = useRef<NavigationAction | null>(null)
  const allowLeaveRef = useRef(false)
  const savingRef = useRef(false)

  const dirty = useMemo(() => {
    return JSON.stringify(normalizeForm(form)) !== JSON.stringify(normalizeForm(initialForm))
  }, [form, initialForm])

  const validate = (): string | null => {
    if (!form.nombre.trim()) return "El nombre es obligatorio"
    const maxEquipos = Number(form.maxEquipos)
    if (!Number.isFinite(maxEquipos) || maxEquipos < 2 || maxEquipos !== Math.floor(maxEquipos))
      return "Equipos debe ser un número entero mayor o igual a 2"
    if (!form.categoriaId) return "Selecciona una categoría"
    if (!form.tipoId) return "Selecciona un tipo"
    if (!form.tipoCompetenciaId) return "Selecciona un tipo de competencia"
    const dur = form.duracionPartido
    if (!dur || !Number.isFinite(Number(dur)) || Number(dur) <= 0) return "Duración del partido es obligatoria y debe ser un número positivo"
    const desc = form.descanso
    if (desc && (!Number.isFinite(Number(desc)) || Number(desc) < 0)) return "Tiempo libre debe ser un número no negativo"

    // Same ruleset either way; only the source of days/hours differs.
    const checkSchedule = (dias: string, horario: string, label: string): string | null => {
      if (!dias) return `Selecciona al menos un día de partido${label}`
      if (!hasValidRanges(horario)) return `Agrega al menos un rango de horario${label}`
      const ranges = parseTimeRanges(horario)
      for (let index = 0; index < ranges.length; index++) {
        const range = ranges[index]
        const rangeError = validateTimeRange(range.start, range.end, ranges, index)
        if (rangeError) return `${rangeError}${label}`
        const capacity = calculateTimeRangeCapacity(range.start, range.end, Number(dur), Number(desc) || 0)
        if (capacity.matchCount === 0) return `El rango ${range.start} - ${range.end} no alcanza para un partido completo${label}`
      }
      return null
    }

    if (form.mismoHorarioTodasLasCanchas) {
      return checkSchedule(form.diasPartido, form.horarioPartido, "")
    }

    if (perCourtRows.length === 0) return "Activa al menos una cancha para esta división"
    for (const row of perCourtRows) {
      const nombre = canchas.find((court) => court.id === row.canchaId)?.nombre ?? "la cancha"
      const error = checkSchedule(row.diasPartido, row.horarioPartido, ` en ${nombre}`)
      if (error) return error
    }
    return null
  }

  const handleSave = async () => {
    if (savingRef.current) return
    const error = validate()
    if (error) { toast.error(error); return }

    savingRef.current = true
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        maxEquipos: Number(form.maxEquipos),
        arbitraje: Number(form.arbitraje) || 0,
        duracionPartido: form.duracionPartido ? Number(form.duracionPartido) : undefined,
        descanso: form.descanso ? Number(form.descanso) : undefined,
        // Con horario compartido se mandan los escalares; por cancha, las filas (el backend
        // deriva el resumen). Un arreglo vacío en edición volvería a los escalares.
        ...(form.mismoHorarioTodasLasCanchas
          ? { diasPartido: form.diasPartido, horarioPartido: form.horarioPartido, ...(isEdit ? { horariosPorCancha: [] } : {}) }
          : { horariosPorCancha: perCourtRows }),
        ligaId: id,
        categoriaId: form.categoriaId,
        tipoId: form.tipoId,
        tipoCompetenciaId: form.tipoCompetenciaId,
        usarPenalesEnEmpates: form.usarPenalesEnEmpates,
      }

      if (isEdit) {
        await updateDivision.mutateAsync({ id: divisionIdParam!, data: payload })
        toast.success("Cambios guardados")
      } else {
        await createDivision.mutateAsync(payload)
        toast.success("División creada")
      }
      allowLeaveRef.current = true
      router.back()
    } catch (e: any) {
      toast.error(e.message || "Error al guardar")
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    if (dirty) {
      setShowDiscard(true)
    } else {
      router.back()
    }
  }, [dirty])

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current || !dirty) return
      e.preventDefault()
      pendingActionRef.current = e.data.action
      setShowDiscard(true)
    })
    return sub
  }, [navigation, dirty])

  useEffect(() => {
    if (!dirty) return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowDiscard(true)
      return true
    })
    return () => sub.remove()
  }, [dirty])

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title={isEdit ? "Editar división" : "Nueva división"} onBack={handleBack} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ gap: Gap.md, padding: Pad.base, paddingBottom: 48 }}
      >
        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Información general</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Nombre *</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: Primera Fuerza"
                placeholderTextColor={Palette.textMuted}
                value={form.nombre}
                onChangeText={(v) => setForm((p) => ({ ...p, nombre: v }))}
                maxLength={30}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Cantidad de equipos *</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: 16"
                placeholderTextColor={Palette.textMuted}
                keyboardType="number-pad"
                value={form.maxEquipos}
                onChangeText={(v) => setForm((p) => ({ ...p, maxEquipos: v }))}
                maxLength={3}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Arbitraje ($)</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: 1200"
                placeholderTextColor={Palette.textMuted}
                keyboardType="number-pad"
                value={form.arbitraje}
                onChangeText={(v) => setForm((p) => ({ ...p, arbitraje: v }))}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Duración del partido (min) *</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: 50"
                placeholderTextColor={Palette.textMuted}
                keyboardType="number-pad"
                value={form.duracionPartido}
                onChangeText={(v) => setForm((p) => ({ ...p, duracionPartido: v }))}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Tiempo libre entre partidos (min)</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: 10"
                placeholderTextColor={Palette.textMuted}
                keyboardType="number-pad"
                value={form.descanso}
                onChangeText={(v) => setForm((p) => ({ ...p, descanso: v }))}
              />
              <Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                Tiempo entre el final de un partido y el inicio del siguiente.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Clasificación</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <SelectField label="Categoría *" current={form.categoriaId} options={lookups.categorias} onSelect={(v) => setForm((p) => ({ ...p, categoriaId: v }))} />
            <SelectField label="Tipo *" current={form.tipoId} options={lookups.tipos} onSelect={(v) => setForm((p) => ({ ...p, tipoId: v }))} />
            <SelectField label="Tipo de competencia *" current={form.tipoCompetenciaId} options={lookups.tiposCompetencia} onSelect={(v) => setForm((p) => ({ ...p, tipoCompetenciaId: v }))} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md, backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: Pad.md }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: Palette.text, fontSize: 14, fontFamily: Fonts.semiBold }}>Desempate por penales</Text>
                <Text style={{ color: Palette.textSecondary, fontSize: 12, fontFamily: Fonts.sans, lineHeight: 17 }}>
                  {form.usarPenalesEnEmpates ? "El ganador recibe 2 puntos y el perdedor 1." : "El empate entrega 1 punto a cada equipo."}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Usar penales en empates"
                value={form.usarPenalesEnEmpates}
                onValueChange={(value) => setForm((p) => ({ ...p, usarPenalesEnEmpates: value }))}
                trackColor={{ false: Palette.dark60, true: Palette.cyan }}
                thumbColor={Palette.white}
              />
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Horario de partido *</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            {canchas.length > 1 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: Fonts.medium, color: Palette.text }}>Mismo horario en todas las canchas</Text>
                  <Text style={{ fontSize: 12, fontFamily: Fonts.sans, color: Palette.textMuted, marginTop: 2 }}>
                    Apágalo para definir días y horario por cancha, y elegir en cuáles juega esta división
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Mismo horario en todas las canchas"
                  value={form.mismoHorarioTodasLasCanchas}
                  onValueChange={(value) => setForm((p) => ({ ...p, mismoHorarioTodasLasCanchas: value }))}
                  trackColor={{ false: Palette.dark60, true: Palette.cyan }}
                  thumbColor={Palette.white}
                />
              </View>
            ) : null}

            {form.mismoHorarioTodasLasCanchas || canchas.length <= 1 ? (
              <>
                <DivisionDaysPicker value={form.diasPartido} onChange={(v) => setForm((p) => ({ ...p, diasPartido: v }))} />
                <TimeRangePicker
                  value={form.horarioPartido}
                  onChange={(v) => setForm((p) => ({ ...p, horarioPartido: v }))}
                  matchDuration={Number(form.duracionPartido) || undefined}
                  breakDuration={Number(form.descanso) || 0}
                />
              </>
            ) : (
              canchas.map((court) => {
                const entry = form.porCancha[court.id] ?? EMPTY_COURT_ENTRY
                return (
                  <View
                    key={court.id}
                    style={{
                      borderWidth: 1,
                      borderColor: entry.juega ? Palette.cyan : Palette.border,
                      borderRadius: Radius.lg,
                      padding: Pad.md,
                      gap: Gap.md,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.md }}>
                      <Text style={{ flex: 1, fontSize: 14, fontFamily: Fonts.semiBold, color: Palette.text }}>{court.nombre}</Text>
                      <Text style={{ fontSize: 12, fontFamily: Fonts.sans, color: Palette.textMuted }}>
                        {entry.juega ? "Juega aquí" : "No juega aquí"}
                      </Text>
                      <Switch
                        accessibilityLabel={`Juega en ${court.nombre}`}
                        value={entry.juega}
                        onValueChange={(value) => setCourt(court.id, { juega: value })}
                        trackColor={{ false: Palette.dark60, true: Palette.cyan }}
                        thumbColor={Palette.white}
                      />
                    </View>
                    {entry.juega ? (
                      <>
                        <DivisionDaysPicker value={entry.diasPartido} onChange={(v) => setCourt(court.id, { diasPartido: v })} />
                        <TimeRangePicker
                          value={entry.horarioPartido}
                          onChange={(v) => setCourt(court.id, { horarioPartido: v })}
                          matchDuration={Number(form.duracionPartido) || undefined}
                          breakDuration={Number(form.descanso) || 0}
                        />
                      </>
                    ) : null}
                  </View>
                )
              })
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ backgroundColor: Palette.cyan, borderRadius: Radius.md, paddingVertical: Pad.md, alignItems: "center", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Palette.black} />
          ) : (
            <Text style={{ fontSize: 16, fontFamily: Fonts.semiBold, color: Palette.black }}>
              {isEdit ? "Guardar cambios" : "Crear división"}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
      <ConfirmationModal
        visible={showDiscard}
        title="Descartar cambios"
        message="¿Seguro que quieres salir? Los cambios no guardados se perderán."
        confirmLabel="Salir"
        cancelLabel="Seguir editando"
        variant="danger"
        onConfirm={() => {
          const action = pendingActionRef.current
          pendingActionRef.current = null
          allowLeaveRef.current = true
          setShowDiscard(false)
          requestAnimationFrame(() => {
            if (action) navigation.dispatch(action)
            else router.back()
          })
        }}
        onClose={() => {
          pendingActionRef.current = null
          setShowDiscard(false)
        }}
      />
    </View>
  )
}

export default function DivisionFormScreen() {
  const raw = useLocalSearchParams<{ id: string; divisionId?: string }>()
  const id = Array.isArray(raw.id) ? raw.id[0] : raw.id
  const divisionIdParam = Array.isArray(raw.divisionId) ? raw.divisionId[0] : raw.divisionId
  const isEdit = Boolean(divisionIdParam)
  const isFocused = useIsFocused()

  const { data: league, isLoading: leagueLoading, error: leagueError } = useLeague(id!, isFocused)
  const lookups = useLookups({ categorias: isFocused, tipos: isFocused, tiposCompetencia: isFocused })
  const { data: division, isLoading: divisionLoading, error: divisionError } = useDivision(divisionIdParam ?? "", isFocused)

  if (leagueLoading || (isEdit && divisionLoading) || lookups.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title={isEdit ? "Editar división" : "Nueva división"} />
        <LoadingScreen />
      </View>
    )
  }

  if (leagueError || divisionError) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Error" onBack={() => router.back()} />
        <ErrorState message={((leagueError || divisionError) as Error).message} onRetry={() => {}} fullScreen />
      </View>
    )
  }

  return (
    <AuthGate>
      <DivisionFormContent
        key={isEdit ? divisionIdParam : "create"}
        id={id!}
        divisionIdParam={divisionIdParam ?? null}
        isEdit={isEdit}
        division={division ?? null}
        lookups={lookups}
        canchas={(league?.canchas ?? []).filter((court) => court.activa)}
      />
    </AuthGate>
  )
}
