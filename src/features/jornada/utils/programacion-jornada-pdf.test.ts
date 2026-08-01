import { describe, expect, it } from "vitest"
import type { PartidoResponse } from "../api/jornadas"
import { programacionJornadaFilename, programacionJornadaHtml } from "./programacion-jornada-pdf"

const metadata = {
  leagueName: 'Liga <Central> & "Norte"',
  divisionName: "Primera & Única",
  categoryName: "Libre <Mayor>",
  jornadaNumero: 7,
}

function partido(id: string, fecha: string | null): PartidoResponse {
  return {
    id,
    golesLocal: 0,
    golesVisitante: 0,
    fecha,
    fechaFin: null,
    estado: null,
    llave: null,
    rondaPlayoffId: null,
    jornadaId: "jornada",
    equipoLocalId: `local-${id}`,
    equipoVisitanteId: `visitante-${id}`,
    canchaId: "cancha",
    cancha: { id: "cancha", nombre: `Cancha ${id}` },
    equipoLocal: { id: `local-${id}`, nombre: `Local ${id}`, logo: null },
    equipoVisitante: { id: `visitante-${id}`, nombre: `Visitante ${id}`, logo: null },
  }
}

describe("single jornada schedule PDF", () => {
  it("renders escaped metadata and exactly the four jornada columns", () => {
    const html = programacionJornadaHtml(metadata, [partido("one", "2026-08-02T08:00:00")])

    expect(html).toContain("Liga &lt;Central&gt; &amp; &quot;Norte&quot;")
    expect(html).toContain("Primera &amp; Única")
    expect(html).toContain("Libre &lt;Mayor&gt;")
    expect(html).toContain("<h1>Jornada 7</h1>")
    expect(html).toContain("<th>Hora</th><th>Cancha</th><th>Local</th><th>Visitante</th>")
    expect(html.match(/<th>/g)).toHaveLength(4)
  })

  it("groups raw dates globally in ascending order and leaves undated matches last", () => {
    const html = programacionJornadaHtml(metadata, [
      partido("late", "2026-08-03T20:00:00"),
      partido("null", null),
      partido("early", "2026-08-01T08:00:00"),
      partido("invalid", "not-a-date"),
      partido("middle", "2026-08-03T09:00:00"),
    ])
    const headings = [...html.matchAll(/<h3>(.*?)<\/h3>/g)].map((match) => match[1])

    expect(headings).toHaveLength(3)
    expect(headings[2]).toBe("Fecha por definir")
    expect(html.indexOf("Local early")).toBeLessThan(html.indexOf("Local middle"))
    expect(html.indexOf("Local middle")).toBeLessThan(html.indexOf("Local late"))
    expect(html.indexOf("Local late")).toBeLessThan(html.indexOf("Local null"))
  })

  it("omits referee data and keeps natural protected table pagination", () => {
    const match = partido("one", "2026-08-02T08:00:00")
    match.arbitros = [{ id: "secret", nombre: "Árbitro Secreto" }]
    const html = programacionJornadaHtml(metadata, [match])

    expect(html).not.toContain("Árbitros")
    expect(html).not.toContain("Árbitro Secreto")
    expect(html).not.toMatch(/break-before|page-break-before/)
    expect(html).toContain("thead { display: table-header-group; }")
    expect(html).toContain("tr { break-inside: avoid; page-break-inside: avoid; }")
    expect(html).not.toMatch(/table \{[^}]*break-inside/)
  })

  it("builds a descriptive filesystem-safe filename", () => {
    expect(programacionJornadaFilename(metadata)).toBe("Liga-Central-Norte-Primera-Unica-Jornada-7.pdf")
    expect(programacionJornadaFilename({ leagueName: "***", divisionName: "///", jornadaNumero: 2 }))
      .toBe("liga-division-Jornada-2.pdf")
  })
})
