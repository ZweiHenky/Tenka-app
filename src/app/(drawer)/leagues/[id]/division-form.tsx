import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, BackHandler, Switch } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useLocalSearchParams, router, useNavigation } from "expo-router"
import type { NavigationAction } from "expo-router/build/react-navigation"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useToast } from "@/shared/components/Toast"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useLookups, type Lookups } from "@/features/league/hooks/useLookups"
import { useDivision, useCreateDivision, useUpdateDivision } from "@/features/division/hooks/useDivisions"
import type { Division } from "@/domain/interfaces/league"
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
}

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
}

function DivisionFormContent({ id, divisionIdParam, isEdit, division, lookups }: FormContentProps) {
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
      }
    }
    return EMPTY_FORM
  })
  const [form, setForm] = useState<FormState>(initialForm)
  const [saving, setSaving] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const navigation = useNavigation()
  const pendingActionRef = useRef<NavigationAction | null>(null)
  const allowLeaveRef = useRef(false)

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
    if (!form.diasPartido) return "Selecciona al menos un día de partido"
    const dur = form.duracionPartido
    if (!dur || !Number.isFinite(Number(dur)) || Number(dur) <= 0) return "Duración del partido es obligatoria y debe ser un número positivo"
    const desc = form.descanso
    if (desc && (!Number.isFinite(Number(desc)) || Number(desc) < 0)) return "Tiempo libre debe ser un número no negativo"
    if (!hasValidRanges(form.horarioPartido)) return "Agrega al menos un rango de horario"

    const ranges = parseTimeRanges(form.horarioPartido)
    for (let index = 0; index < ranges.length; index++) {
      const range = ranges[index]
      const rangeError = validateTimeRange(range.start, range.end, ranges, index)
      if (rangeError) return rangeError
      const capacity = calculateTimeRangeCapacity(range.start, range.end, Number(dur), Number(desc) || 0)
      if (capacity.matchCount === 0) return `El rango ${range.start} - ${range.end} no alcanza para un partido completo`
    }
    return null
  }

  const handleSave = async () => {
    const error = validate()
    if (error) { toast.error(error); return }

    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        maxEquipos: Number(form.maxEquipos),
        arbitraje: Number(form.arbitraje) || 0,
        duracionPartido: form.duracionPartido ? Number(form.duracionPartido) : undefined,
        descanso: form.descanso ? Number(form.descanso) : undefined,
        diasPartido: form.diasPartido,
        horarioPartido: form.horarioPartido,
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
            <DivisionDaysPicker value={form.diasPartido} onChange={(v) => setForm((p) => ({ ...p, diasPartido: v }))} />
            <TimeRangePicker
              value={form.horarioPartido}
              onChange={(v) => setForm((p) => ({ ...p, horarioPartido: v }))}
              matchDuration={Number(form.duracionPartido) || undefined}
              breakDuration={Number(form.descanso) || 0}
            />
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

  const { isLoading: leagueLoading, error: leagueError } = useLeague(id!)
  const lookups = useLookups()
  const { data: division, isLoading: divisionLoading, error: divisionError } = useDivision(divisionIdParam ?? "")

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
      />
    </AuthGate>
  )
}
