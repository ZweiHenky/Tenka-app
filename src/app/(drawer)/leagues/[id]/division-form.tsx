import { useState, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useLocalSearchParams, router } from "expo-router"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { useToast } from "@/shared/components/Toast"
import { useLeague } from "@/features/league/hooks/useLeagues"
import { useLookups, type Lookups } from "@/features/league/hooks/useLookups"
import { useDivision, useCreateDivision, useUpdateDivision } from "@/features/division/hooks/useDivisions"
import type { Division } from "@/domain/interfaces/league"
import { SelectField } from "@/shared/components/SelectField"
import { TimeRangePicker } from "@/shared/components/TimeRangePicker"
import CustomHeader from "@/shared/components/CustomHeader"
import LoadingScreen from "@/shared/components/LoadingScreen"
import ErrorState from "@/shared/components/ErrorState"
import { AuthGate } from "@/shared/components/AuthGate"

const DIAS_OPTIONS = [
  { id: "L-V", nombre: "Lunes a Viernes (L-V)" },
  { id: "S-D", nombre: "Sábado y Domingo (S-D)" },
  { id: "D", nombre: "Domingo (D)" },
  { id: "S", nombre: "Sábado (S)" },
  { id: "L", nombre: "Lunes (L)" },
  { id: "Ma", nombre: "Martes (Ma)" },
  { id: "Mi", nombre: "Miércoles (Mi)" },
  { id: "J", nombre: "Jueves (J)" },
  { id: "V", nombre: "Viernes (V)" },
]

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
}

function parseRanges(value: string): { start: string; end: string }[] {
  if (!value) return []
  return value.split(" / ").map((r) => {
    let parts = r.split(" - ").map((s) => s.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    parts = r.split("-").map((s) => s.trim())
    if (parts.length === 2) return { start: parts[0], end: parts[1] }
    return null
  }).filter(Boolean) as { start: string; end: string }[]
}

function hasValidRanges(value: string): boolean {
  const ranges = parseRanges(value)
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

  const [form, setForm] = useState<FormState>(() => {
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
      }
    }
    return EMPTY_FORM
  })
  const [saving, setSaving] = useState(false)

  const validate = (): string | null => {
    if (!form.nombre.trim()) return "El nombre es obligatorio"
    const maxEquipos = Number(form.maxEquipos)
    if (!Number.isFinite(maxEquipos) || maxEquipos < 2 || maxEquipos !== Math.floor(maxEquipos))
      return "Equipos debe ser un número entero mayor o igual a 2"
    if (!form.categoriaId) return "Selecciona una categoría"
    if (!form.tipoId) return "Selecciona un tipo"
    if (!form.tipoCompetenciaId) return "Selecciona un tipo de competencia"
    if (!form.diasPartido) return "Selecciona al menos un día de partido"
    if (!hasValidRanges(form.horarioPartido)) return "Agrega al menos un rango de horario"
    const dur = form.duracionPartido
    if (dur && (!Number.isFinite(Number(dur)) || Number(dur) <= 0)) return "Duración debe ser un número positivo"
    const desc = form.descanso
    if (desc && (!Number.isFinite(Number(desc)) || Number(desc) < 0)) return "Descanso debe ser un número no negativo"
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
      }

      if (isEdit) {
        await updateDivision.mutateAsync({ id: divisionIdParam!, data: payload })
        toast.success("Cambios guardados")
      } else {
        await createDivision.mutateAsync(payload)
        toast.success("División creada")
      }
      router.back()
    } catch (e: any) {
      toast.error(e.message || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    const dirty = Object.entries(form).some(([k, v]) => {
      if (k === "arbitraje") return v !== (isEdit ? String(division?.arbitraje ?? 0) : "")
      if (k === "maxEquipos") return v !== (isEdit ? String(division?.maxEquipos ?? "") : "")
      if (k === "nombre") return v !== (isEdit ? division?.nombre ?? "" : "")
      return v !== ""
    })
    if (dirty) {
      Alert.alert("Descartar cambios", "¿Seguro que quieres salir? Los cambios no guardados se perderán.", [
        { text: "Seguir editando", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }, [form, isEdit, division])

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
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Duración del partido (min)</Text>
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
              <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: Palette.textSecondary, marginBottom: 4 }}>Descanso entre partidos (min)</Text>
              <TextInput
                style={{ backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.md, fontSize: 15, color: Palette.text }}
                placeholder="Ej: 10"
                placeholderTextColor={Palette.textMuted}
                keyboardType="number-pad"
                value={form.descanso}
                onChangeText={(v) => setForm((p) => ({ ...p, descanso: v }))}
              />
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
          </View>
        </View>

        <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
          <View style={{ backgroundColor: Palette.cyan10, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingHorizontal: Pad.base, paddingVertical: Pad.sm }}>
            <Text style={{ fontSize: 13, fontFamily: Fonts.semiBold, color: Palette.cyan }}>Horario de partido *</Text>
          </View>
          <View style={{ padding: Pad.base, gap: Gap.md }}>
            <SelectField label="Días de partido *" current={form.diasPartido} options={DIAS_OPTIONS} onSelect={(v) => setForm((p) => ({ ...p, diasPartido: v }))} />
            <TimeRangePicker value={form.horarioPartido} onChange={(v) => setForm((p) => ({ ...p, horarioPartido: v }))} />
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
