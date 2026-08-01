import { useEffect, useState } from "react"
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import ConfirmationModal from "@/shared/components/ConfirmationModal"
import ErrorState from "@/shared/components/ErrorState"
import { useToast } from "@/shared/components/Toast"
import { downloadPdf } from "@/shared/utils/print-pdf"
import { formatLocalTime } from "@/shared/utils/date-time"
import { Fonts, Gap, Pad, Palette, Radius } from "@/constants/theme"
import { useRefereeAssignmentStore } from "@/stores/refereeAssignments"
import { refereeApi } from "./api"
import { useRefereeBatches, useRefereeCandidates, useRefereeMutations } from "./hooks"
import { refereeBatchHtml } from "./pdf"
import type { LeagueReferee, RefereeBatchDetail, RefereeCandidateDivision, RefereeMatch } from "./types"
import { assignmentProgress, groupMatchesByDay, groupMatchesByDivision, scheduledMatches } from "./utils"

interface Props { leagueId: string; referees: LeagueReferee[] }

const card = { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.lg, padding: Pad.base, gap: Gap.md } as const

function Button({ label, onPress, disabled, icon = "save", secondary = false, danger = false }: { label: string; onPress: () => void; disabled?: boolean; icon?: keyof typeof MaterialIcons.glyphMap; secondary?: boolean; danger?: boolean }) {
  const color = danger ? Palette.danger : Palette.cyan
  const outlined = secondary || danger
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={{ opacity: disabled ? 0.45 : 1, minHeight: 42, borderRadius: Radius.md, paddingHorizontal: Pad.md, paddingVertical: Pad.sm, backgroundColor: outlined ? `${color}10` : color, borderWidth: 1, borderColor: color, flexDirection: "row", gap: Gap.sm, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={icon} size={18} color={outlined ? color : Palette.black} /><Text style={{ color: outlined ? color : Palette.black, fontFamily: Fonts.semiBold }}>{label}</Text></TouchableOpacity>
}

const divisionMatches = (division: RefereeCandidateDivision) => [...division.jornadas, ...division.rondasPlayoff].flatMap((group) => group.partidos)

function ProgressBar({ assigned, total, percent }: { assigned: number; total: number; percent: number }) {
  return <View style={{ gap: Gap.micro }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: Palette.textSecondary, fontFamily: Fonts.medium, fontSize: 12 }}>{assigned} de {total} programados</Text><Text style={{ color: percent === 100 ? Palette.success : Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 12 }}>{percent}%</Text></View><View style={{ height: 7, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight }}><View style={{ width: `${percent}%` as `${number}%`, height: "100%", borderRadius: Radius.full, backgroundColor: percent === 100 ? Palette.success : Palette.cyan }} /></View></View>
}

function RefereeDivisionDetail({ name, matches, assignments, referees, onBack, onMatchPress }: { name: string; matches: RefereeMatch[]; assignments: Record<string, string[]>; referees: LeagueReferee[]; onBack: () => void; onMatchPress: (match: RefereeMatch) => void }) {
  const days = groupMatchesByDay(matches)
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(days[0]?.key ?? null)
  return <View style={{ gap: Gap.lg }}>
    <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}><MaterialIcons name="arrow-back" size={22} color={Palette.cyan} /><Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold }}>Divisiones</Text></TouchableOpacity>
    <View style={{ gap: Gap.sm }}><View><Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 20 }}>{name}</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans }}>{matches.length} partidos</Text></View><ProgressBar {...assignmentProgress(matches, assignments)} /></View>
    {days.map((day) => {
      const expanded = expandedDayKey === day.key
      const dayLabel = day.key === "sin-fecha" ? "Sin fecha" : new Date(`${day.key}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
      return <View key={day.key} style={{ gap: Gap.sm }}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${dayLabel}, ${day.matches.length} partidos`} onPress={() => setExpandedDayKey(expanded ? null : day.key)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Palette.surfaceLight, borderRadius: Radius.md, paddingHorizontal: Pad.md, paddingVertical: Pad.sm }}><View><Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold, textTransform: "uppercase" }}>{dayLabel}</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 11 }}>{day.matches.length} partido(s)</Text></View><MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={22} color={Palette.textMuted} /></TouchableOpacity>
        {expanded ? day.matches.map((match) => { const names = referees.filter((referee) => (assignments[match.id] ?? []).includes(referee.id)).map((referee) => referee.nombre); return <TouchableOpacity key={match.id} onPress={() => onMatchPress(match)} style={card}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Gap.sm }}><View><Text style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>{match.fecha ? formatLocalTime(match.fecha) : "Sin hora"}{match.fechaFin ? ` - ${formatLocalTime(match.fechaFin)}` : ""}</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans }}>{match.cancha?.nombre ?? "Sin cancha"}</Text></View><MaterialIcons name="chevron-right" size={24} color={Palette.textMuted} /></View><Text style={{ color: names.length ? Palette.success : Palette.warning, fontFamily: Fonts.medium }}>{names.join(", ") || "Seleccionar árbitros"}</Text></TouchableOpacity> }) : null}
      </View>
    })}
    {!matches.length ? <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, textAlign: "center" }}>Esta división todavía no tiene partidos.</Text> : null}
  </View>
}

export default function LeagueRefereeTab({ leagueId, referees }: Props) {
  const toast = useToast()
  const candidates = useRefereeCandidates(leagueId)
  const batches = useRefereeBatches(leagueId)
  const mutations = useRefereeMutations(leagueId)
  const draft = useRefereeAssignmentStore((state) => state.drafts[leagueId])
  const hydrate = useRefereeAssignmentStore((state) => state.hydrate)
  const setSelectedDivisions = useRefereeAssignmentStore((state) => state.setSelectedDivisions)
  const setMatchReferees = useRefereeAssignmentStore((state) => state.setMatchReferees)
  const clearAssignments = useRefereeAssignmentStore((state) => state.clearAssignments)
  const completeAssignment = useRefereeAssignmentStore((state) => state.completeAssignment)
  const [selectingDivisions, setSelectingDivisions] = useState(false)
  const [divisionSelection, setDivisionSelection] = useState<string[]>([])
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null)
  const [savedActiveDivisionId, setSavedActiveDivisionId] = useState<string | null>(null)
  const [editingMatch, setEditingMatch] = useState<RefereeMatch | null>(null)
  const [editingRefereeIds, setEditingRefereeIds] = useState<string[]>([])
  const [clearOpen, setClearOpen] = useState(false)
  const [savedAssignment, setSavedAssignment] = useState<RefereeBatchDetail | null>(null)
  const [savedAssignments, setSavedAssignments] = useState<Record<string, string[]>>({})
  const [savedDirty, setSavedDirty] = useState(false)
  const [openingSavedId, setOpeningSavedId] = useState<string | null>(null)
  const [deleteSavedOpen, setDeleteSavedOpen] = useState(false)
  const activeReferees = referees.filter((referee) => referee.activo)

  useEffect(() => {
    if (!candidates.data) return
    const activeIds = new Set(referees.filter((referee) => referee.activo).map((referee) => referee.id))
    const assignments: Record<string, string[]> = {}
    const divisionsWithAssignments: string[] = []
    candidates.data.forEach((division) => {
      const matches = divisionMatches(division)
      matches.forEach((match) => { assignments[match.id] = match.arbitros.map((referee) => referee.id).filter((id) => activeIds.has(id)) })
      if (matches.some((match) => match.arbitros.length)) divisionsWithAssignments.push(division.id)
    })
    hydrate(leagueId, divisionsWithAssignments, assignments)
  }, [candidates.data, hydrate, leagueId, referees])

  if (candidates.isLoading || batches.isLoading) return <ActivityIndicator color={Palette.cyan} style={{ marginVertical: 40 }} />
  if (candidates.error || batches.error) return <ErrorState message={(candidates.error ?? batches.error as Error).message} onRetry={() => { candidates.refetch(); batches.refetch() }} />

  const divisions = candidates.data ?? []
  const availableDivisions = divisions.filter((division) => scheduledMatches(divisionMatches(division)).length > 0)
  const selectedIds = draft?.selectedDivisionIds ?? []
  const assignments = draft?.assignments ?? {}
  const selectedDivisions = availableDivisions.filter((division) => selectedIds.includes(division.id))
  const selectedMatches = selectedDivisions.flatMap(divisionMatches)
  const progress = assignmentProgress(selectedMatches, assignments)
  const isComplete = progress.total > 0 && progress.assigned === progress.total
  const activeDivision = divisions.find((division) => division.id === activeDivisionId) ?? null
  const openDivisionSelection = () => { setDivisionSelection(selectedIds); setSelectingDivisions(true) }
  const saveDivisionSelection = () => {
    const removedIds = selectedIds.filter((id) => !divisionSelection.includes(id))
    const removedMatchIds = availableDivisions.filter((division) => removedIds.includes(division.id)).flatMap(divisionMatches).map((match) => match.id)
    setSelectedDivisions(leagueId, divisionSelection, removedMatchIds)
    setSelectingDivisions(false)
  }
  const openDivision = (division: RefereeCandidateDivision) => {
    setActiveDivisionId(division.id)
  }
  const saveAll = () => {
    if (!isComplete) { toast.error("Completa todos los partidos programados antes de guardar"); return }
    const matchesToSave = scheduledMatches(selectedMatches)
    mutations.saveLeagueAssignments.mutate({
      divisionIds: selectedIds,
      asignaciones: matchesToSave.map((match) => ({ partidoId: match.id, arbitroIds: assignments[match.id] ?? [] })),
    }, {
      onSuccess: (result) => { completeAssignment(leagueId, result.asignacionId); toast.success("Asignación guardada. Ya puedes descargar el PDF") },
      onError: (error) => toast.error(error.message || "No se pudieron guardar las asignaciones"),
    })
  }
  const openMatch = (match: RefereeMatch) => { setEditingMatch(match); setEditingRefereeIds((savedAssignment ? savedAssignments : assignments)[match.id] ?? []) }
  const closeMatch = () => { setEditingMatch(null); setEditingRefereeIds([]) }
  const applyMatch = () => {
    if (!editingMatch) return
    if (savedAssignment) { setSavedAssignments((current) => ({ ...current, [editingMatch.id]: editingRefereeIds })); setSavedDirty(true) }
    else setMatchReferees(leagueId, editingMatch.id, editingRefereeIds)
    closeMatch()
  }
  const downloadSavedAssignment = async (assignment: RefereeBatchDetail) => {
    try { await downloadPdf(refereeBatchHtml(assignment), `${assignment.nombre}.pdf`) }
    catch (error) { toast.error((error as Error).message || "No se pudo generar el PDF") }
  }
  const openSavedAssignment = async (assignmentId: string) => {
    setOpeningSavedId(assignmentId)
    try {
      const detail = await refereeApi.detail(leagueId, assignmentId)
      setSavedAssignment(detail)
      setSavedAssignments(Object.fromEntries(detail.partidos.map((match) => [match.id, match.arbitros.map((referee) => referee.id)])))
      setSavedDirty(false)
      setSavedActiveDivisionId(null)
    } catch (error) { toast.error((error as Error).message || "No se pudo abrir la asignación") }
    finally { setOpeningSavedId(null) }
  }
  const saveSavedAssignment = () => {
    if (!savedAssignment || !savedDirty) return
    const divisionIds = [...new Set(savedAssignment.partidos.flatMap((match) => match.jornada?.division.id ?? match.rondaPlayoff?.division.id ?? []))]
    mutations.saveLeagueAssignments.mutate({ asignacionId: savedAssignment.id, divisionIds, asignaciones: savedAssignment.partidos.map((match) => ({ partidoId: match.id, arbitroIds: savedAssignments[match.id] ?? [] })) }, {
      onSuccess: async () => {
        const detail = await refereeApi.detail(leagueId, savedAssignment.id)
        setSavedAssignment(detail); setSavedAssignments(Object.fromEntries(detail.partidos.map((match) => [match.id, match.arbitros.map((referee) => referee.id)]))); setSavedDirty(false)
        toast.success("Corrección guardada")
      },
      onError: (error) => toast.error(error.message || "No se pudo guardar la corrección"),
    })
  }
  const removeSavedAssignment = () => {
    if (!savedAssignment || mutations.removeAssignment.isPending) return
    mutations.removeAssignment.mutate(savedAssignment.id, {
      onSuccess: () => { setDeleteSavedOpen(false); setSavedAssignment(null); setSavedAssignments({}); setSavedDirty(false); toast.success("Asignación eliminada") },
      onError: (error) => toast.error(error.message || "No se pudo eliminar la asignación"),
    })
  }
  const clearLocalAssignments = () => {
    clearAssignments(leagueId, selectedMatches.map((match) => match.id))
    setClearOpen(false)
    toast.info("Borrador local limpiado")
  }

  if (savedAssignment) {
    const savedProgress = assignmentProgress(savedAssignment.partidos, savedAssignments)
    const savedDivisions = groupMatchesByDivision(savedAssignment.partidos)
    const savedActiveDivision = savedDivisions.find((division) => division.id === savedActiveDivisionId)
    if (savedActiveDivision) return <View style={{ gap: Gap.lg }}>
      <RefereeDivisionDetail name={savedActiveDivision.nombre} matches={savedActiveDivision.matches} assignments={savedAssignments} referees={activeReferees} onBack={() => setSavedActiveDivisionId(null)} onMatchPress={openMatch} />
      <AppBottomSheetModal visible={editingMatch !== null} onClose={closeMatch} title="Seleccionar árbitros" snapPoints={["65%"]}>{editingMatch ? <>{activeReferees.map((referee) => { const selected = editingRefereeIds.includes(referee.id); return <TouchableOpacity key={referee.id} onPress={() => setEditingRefereeIds((ids) => selected ? ids.filter((id) => id !== referee.id) : [...ids, referee.id])} style={{ ...card, padding: Pad.md, flexDirection: "row", alignItems: "center" }}><MaterialIcons name={selected ? "check-box" : "check-box-outline-blank"} size={23} color={Palette.cyan} /><Text style={{ color: Palette.text, fontFamily: Fonts.medium }}>{referee.nombre}</Text></TouchableOpacity> })}<Button label="Aplicar al partido" onPress={applyMatch} /></> : null}</AppBottomSheetModal>
    </View>
    return <View style={{ gap: Gap.lg }}>
      <TouchableOpacity onPress={() => { setSavedAssignment(null); setSavedAssignments({}); setSavedDirty(false); setSavedActiveDivisionId(null) }} style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}><MaterialIcons name="arrow-back" size={22} color={Palette.cyan} /><Text style={{ color: Palette.cyan, fontFamily: Fonts.semiBold }}>Asignaciones guardadas</Text></TouchableOpacity>
      <View style={{ gap: Gap.sm }}><Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 20 }}>{savedAssignment.nombre}</Text><ProgressBar {...savedProgress} /></View>
      {savedDivisions.map((division) => <TouchableOpacity key={division.id} onPress={() => setSavedActiveDivisionId(division.id)} style={card}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 18, flex: 1 }}>{division.nombre}</Text><MaterialIcons name="chevron-right" size={26} color={Palette.cyan} /></View><ProgressBar {...assignmentProgress(division.matches, savedAssignments)} /></TouchableOpacity>)}
      <Button label="Guardar corrección" disabled={!savedDirty || savedProgress.percent !== 100 || mutations.saveLeagueAssignments.isPending} onPress={saveSavedAssignment} />
      <Button label="Descargar PDF" icon="picture-as-pdf" secondary disabled={savedDirty} onPress={() => downloadSavedAssignment(savedAssignment)} />
      <Button label="Eliminar asignación" icon="delete-outline" danger disabled={mutations.removeAssignment.isPending} onPress={() => setDeleteSavedOpen(true)} />
      {savedDirty ? <Text style={{ color: Palette.warning, fontFamily: Fonts.sans, textAlign: "center", fontSize: 12 }}>Guarda la corrección antes de descargar.</Text> : null}
      <AppBottomSheetModal visible={editingMatch !== null} onClose={closeMatch} title="Seleccionar árbitros" snapPoints={["65%"]}>{editingMatch ? <>{activeReferees.map((referee) => { const selected = editingRefereeIds.includes(referee.id); return <TouchableOpacity key={referee.id} onPress={() => setEditingRefereeIds((ids) => selected ? ids.filter((id) => id !== referee.id) : [...ids, referee.id])} style={{ ...card, padding: Pad.md, flexDirection: "row", alignItems: "center" }}><MaterialIcons name={selected ? "check-box" : "check-box-outline-blank"} size={23} color={Palette.cyan} /><Text style={{ color: Palette.text, fontFamily: Fonts.medium }}>{referee.nombre}</Text></TouchableOpacity> })}<Button label="Aplicar al partido" onPress={applyMatch} /></> : null}</AppBottomSheetModal>
      <ConfirmationModal visible={deleteSavedOpen} title="Eliminar asignación" message={`Se eliminará ${savedAssignment.nombre} y los árbitros asociados a sus partidos. Las jornadas y partidos permanecerán y volverán a aparecer como pendientes.`} highlightText={savedAssignment.nombre} confirmLabel="Eliminar" variant="danger" loading={mutations.removeAssignment.isPending} onConfirm={removeSavedAssignment} onClose={() => setDeleteSavedOpen(false)} />
    </View>
  }

  if (activeDivision) {
    const matches = divisionMatches(activeDivision)
    return <View style={{ gap: Gap.lg }}>
      <RefereeDivisionDetail name={activeDivision.nombre} matches={matches} assignments={assignments} referees={activeReferees} onBack={() => setActiveDivisionId(null)} onMatchPress={openMatch} />
      <AppBottomSheetModal visible={editingMatch !== null} onClose={closeMatch} title="Seleccionar árbitros" snapPoints={["65%"]}>
        {editingMatch ? <>{activeReferees.map((referee) => { const selected = editingRefereeIds.includes(referee.id); return <TouchableOpacity key={referee.id} onPress={() => setEditingRefereeIds((ids) => selected ? ids.filter((id) => id !== referee.id) : [...ids, referee.id])} style={{ ...card, padding: Pad.md, flexDirection: "row", alignItems: "center" }}><MaterialIcons name={selected ? "check-box" : "check-box-outline-blank"} size={23} color={Palette.cyan} /><Text style={{ color: Palette.text, fontFamily: Fonts.medium }}>{referee.nombre}</Text></TouchableOpacity> })}<Button label="Aplicar al partido" onPress={applyMatch} /></> : null}
      </AppBottomSheetModal>
    </View>
  }

  return <View style={{ gap: Gap.lg }}>
    {availableDivisions.length ? <View style={{ alignItems: "flex-end" }}><Button label="Asignar árbitros" icon="assignment-ind" onPress={openDivisionSelection} /></View> : <View style={{ alignItems: "center", gap: Gap.sm, paddingVertical: Pad.md }}><MaterialIcons name="event-busy" size={30} color={Palette.textMuted} /><Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 15 }}>Se necesitan nuevas jornadas</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 13, textAlign: "center" }}>Genera una nueva jornada con partidos programados para crear otra asignación de árbitros.</Text></View>}
    {selectedDivisions.length ? <View style={{ gap: Gap.sm }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: Palette.text, fontFamily: Fonts.semiBold, fontSize: 14 }}>Progreso general</Text><Text style={{ color: progress.percent === 100 ? Palette.success : Palette.cyan, fontFamily: Fonts.semiBold, fontSize: 12 }}>{progress.assigned} de {progress.total} · {progress.percent}%</Text></View><View style={{ height: 7, borderRadius: Radius.full, overflow: "hidden", backgroundColor: Palette.surfaceLight }}><View style={{ width: `${progress.percent}%` as `${number}%`, height: "100%", borderRadius: Radius.full, backgroundColor: progress.percent === 100 ? Palette.success : Palette.cyan }} /></View></View> : null}
    {selectedDivisions.length ? selectedDivisions.map((division) => {
      const matches = divisionMatches(division)
      return <TouchableOpacity key={division.id} onPress={() => openDivision(division)} style={card}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View style={{ flex: 1 }}><Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 18 }}>{division.nombre}</Text></View><MaterialIcons name="chevron-right" size={26} color={Palette.cyan} /></View><ProgressBar {...assignmentProgress(matches, assignments)} /></TouchableOpacity>
    }) : availableDivisions.length ? <Text style={{ color: Palette.textSecondary, fontFamily: Fonts.sans, textAlign: "center" }}>Selecciona las divisiones que quieres configurar.</Text> : null}
    {selectedDivisions.length ? <><Button label="Guardar asignación" disabled={mutations.saveLeagueAssignments.isPending || !draft?.hasUnsavedChanges || !isComplete} onPress={saveAll} /><Button label="Limpiar asignaciones" icon="delete-sweep" danger disabled={progress.assigned === 0} onPress={() => setClearOpen(true)} />{!isComplete ? <Text style={{ color: Palette.warning, fontFamily: Fonts.sans, textAlign: "center", fontSize: 12 }}>Asigna al menos un árbitro a todos los partidos programados para guardar.</Text> : draft?.hasUnsavedChanges ? <Text style={{ color: Palette.warning, fontFamily: Fonts.sans, textAlign: "center", fontSize: 12 }}>Tienes cambios pendientes por guardar.</Text> : null}</> : null}
    {batches.data?.length ? <View style={{ gap: Gap.sm }}><Text style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 18 }}>Asignaciones guardadas</Text>{batches.data.map((batch) => <View key={batch.id} style={card}><View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}><TouchableOpacity disabled={openingSavedId === batch.id} onPress={() => openSavedAssignment(batch.id)} style={{ flex: 1 }}><Text style={{ color: Palette.text, fontFamily: Fonts.semiBold }}>{batch.nombre}</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>{batch._count.partidos} partidos</Text></TouchableOpacity><TouchableOpacity disabled={openingSavedId === batch.id} onPress={async () => { try { const detail = await refereeApi.detail(leagueId, batch.id); await downloadSavedAssignment(detail) } catch (error) { toast.error((error as Error).message) } }} style={{ padding: Pad.sm }}>{openingSavedId === batch.id ? <ActivityIndicator color={Palette.cyan} /> : <MaterialIcons name="picture-as-pdf" size={25} color={Palette.cyan} />}</TouchableOpacity><TouchableOpacity onPress={() => openSavedAssignment(batch.id)} style={{ padding: Pad.sm }}><MaterialIcons name="edit" size={23} color={Palette.textSecondary} /></TouchableOpacity></View></View>)}</View> : null}
    <AppBottomSheetModal visible={selectingDivisions} onClose={() => setSelectingDivisions(false)} title="Seleccionar divisiones" snapPoints={["70%"]}>
      {availableDivisions.map((division) => { const selected = divisionSelection.includes(division.id); return <TouchableOpacity key={division.id} onPress={() => setDivisionSelection((ids) => selected ? ids.filter((id) => id !== division.id) : [...ids, division.id])} style={{ ...card, flexDirection: "row", alignItems: "center" }}><MaterialIcons name={selected ? "check-box" : "check-box-outline-blank"} size={24} color={Palette.cyan} /><View><Text style={{ color: Palette.text, fontFamily: Fonts.medium }}>{division.nombre}</Text><Text style={{ color: Palette.textMuted, fontFamily: Fonts.sans, fontSize: 12 }}>{scheduledMatches(divisionMatches(division)).length} partidos nuevos programados</Text></View></TouchableOpacity> })}
      <Button label="Aceptar divisiones" onPress={saveDivisionSelection} />
    </AppBottomSheetModal>
    <ConfirmationModal visible={clearOpen} title="Limpiar asignaciones" message="Se eliminarán únicamente las asignaciones del borrador local. Lo guardado en el servidor no cambiará hasta que completes y guardes una nueva configuración." confirmLabel="Limpiar" variant="danger" onConfirm={clearLocalAssignments} onClose={() => setClearOpen(false)} />
  </View>
}
