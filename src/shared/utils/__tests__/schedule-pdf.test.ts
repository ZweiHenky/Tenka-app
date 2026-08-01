import { describe, expect, it } from "vitest"
import { groupScheduleByLocalDate, renderSchedulePdf } from "../schedule-pdf"

describe("schedule PDF presentation", () => {
  it("parses date-only values locally and groups invalid values last", () => {
    const groups = groupScheduleByLocalDate([
      { id: "invalid", fecha: "invalid" },
      { id: "later", fecha: "2026-08-03" },
      { id: "earlier", fecha: "2026-08-01" },
    ], (item) => item.fecha)

    expect(groups.map((group) => group.key)).toEqual(["2026-08-01", "2026-08-03", "sin-fecha"])
    expect(groups[2].label).toBe("Fecha por definir")
  })

  it("escapes presentation fields and protects headers and rows across natural pages", () => {
    const html = renderSchedulePdf({
      kicker: "Liga <Uno>",
      title: "Programación & resultados",
      columns: [{ label: "Local", width: "100%" }],
      groups: [{ label: "Fecha <uno>", rows: [[{ value: "Equipo & rival", className: "team" }]] }],
    })

    expect(html).toContain("Liga &lt;Uno&gt;")
    expect(html).toContain("Programación &amp; resultados")
    expect(html).toContain("Fecha &lt;uno&gt;")
    expect(html).toContain("Equipo &amp; rival")
    expect(html).toContain("thead { display: table-header-group; }")
    expect(html).toContain("tr { break-inside: avoid; page-break-inside: avoid; }")
    expect(html).not.toMatch(/break-before|page-break-before/)
  })
})
