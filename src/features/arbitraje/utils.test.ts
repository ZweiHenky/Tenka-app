import { describe, expect, it } from "vitest"
import type { RefereeBatchDetail, RefereeCandidateDivision, RefereeMatch } from "./types"
import { refereeAssignmentsHtml, refereeBatchHtml } from "./pdf"
import { assignmentProgress, groupMatchesByDay, groupMatchesByDivision } from "./utils"

const match = (id: string, fecha: string | null): RefereeMatch => ({ id, fecha, fechaFin: fecha ? new Date(new Date(fecha).getTime() + 3600000).toISOString() : null, equipoLocal: { id: "l", nombre: "Local & Co" }, equipoVisitante: { id: "v", nombre: "Visita" }, cancha: { id: "c", nombre: "Cancha 1" }, jornada: { id: "j", numero: 1, division: { id: "d", nombre: "Primera" } }, rondaPlayoff: null, arbitros: [{ id: "a", nombre: "Ana" }] })

describe("referee output helpers", () => {
  it("groups chronologically and leaves undated matches last", () => {
    const groups = groupMatchesByDay([match("none", null), match("later", "2026-08-02T20:00:00Z"), match("first", "2026-08-01T20:00:00Z")])
    expect(groups.map((group) => group.key)).toEqual(["2026-08-01", "2026-08-02", "sin-fecha"])
  })

  it("counts only scheduled matches toward assignment progress", () => {
    const progress = assignmentProgress([match("scheduled", "2026-08-01T20:00:00Z"), match("pending", null)], { scheduled: ["a"] })
    expect(progress).toEqual({ assigned: 1, total: 1, percent: 100 })
  })

  it("groups assignment details by division and then by local day", () => {
    const first = match("one", "2026-08-01T20:00:00Z")
    const second = { ...match("two", "2026-08-02T20:00:00Z"), jornada: { id: "j2", numero: 1, division: { id: "a", nombre: "Ascenso" } } }
    const groups = groupMatchesByDivision([first, second])

    expect(groups.map((group) => group.nombre)).toEqual(["Ascenso", "Primera"])
    expect(groups[0].days[0].matches.map((item) => item.id)).toEqual(["two"])
    expect(groups[1].days[0].matches.map((item) => item.id)).toEqual(["one"])
  })

  it("escapes values and includes every PDF column", () => {
    const batch = { id: "b", nombre: "Tanda <Final>", createdAt: "", partidos: [match("one", "2026-08-01T20:00:00Z")] } as RefereeBatchDetail
    const html = refereeBatchHtml(batch)
    expect(html).toContain("Tanda &lt;Final&gt;")
    expect(html).toContain("Árbitros")
    expect(html).toContain("Ana")
    expect(html).not.toContain("Local &amp; Co")
    expect(html).not.toContain("Cancha")
  })

  it("creates a direct assignment PDF without team names", () => {
    const division: RefereeCandidateDivision = { id: "d", nombre: "Primera", jornadas: [{ id: "j", numero: 1, partidos: [match("one", "2026-08-01T20:00:00Z")] }], rondasPlayoff: [] }
    const html = refereeAssignmentsHtml([division], { one: ["a"] }, [{ id: "a", nombre: "Ana", activo: true }])
    expect(html).toContain("Asignaciones de árbitros")
    expect(html).toContain("Primera")
    expect(html).toContain("Ana")
    expect(html).not.toContain("Local &amp; Co")
    expect(html).not.toContain("Cancha")
  })
})
