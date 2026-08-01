import { describe, expect, it } from "vitest"
import type { ProgramacionRecienteLigaDto, ProgramacionRecientePartidoDto } from "../api/leagues"
import { groupProgramacionByLocalDate, hasProgramacionReciente, programacionRecienteHtml, type ProgramacionPdfMatch } from "./programacion-reciente-pdf"

function match(id: string, fecha: string | null, local = `Local ${id}`): ProgramacionRecientePartidoDto {
  return {
    id,
    fecha,
    fechaFin: null,
    cancha: { id: "c", nombre: "Cancha 1" },
    equipoLocal: { id: `l-${id}`, nombre: local, logo: null },
    equipoVisitante: { id: `v-${id}`, nombre: `Visitante ${id}`, logo: null },
  }
}

function schedule(divisiones: ProgramacionRecienteLigaDto["divisiones"]): ProgramacionRecienteLigaDto {
  return { id: "liga", nombre: "Liga Central", divisiones }
}

function jornada(partidos: ProgramacionRecientePartidoDto[]) {
  return { id: "j", numero: 1, fechaInicio: null, fechaFin: null, partidos }
}

function pdfMatch(partido: ProgramacionRecientePartidoDto): ProgramacionPdfMatch {
  return { partido, jornadaNumero: 1, divisionNombre: "Primera", categoriaNombre: "Libre" }
}

function division(id: string, nombre: string, partidos: ProgramacionRecientePartidoDto[], categoriaNombre = "Libre") {
  return { id, nombre, categoria: { id: `c-${id}`, nombre: categoriaNombre }, jornadas: [jornada(partidos)] }
}

describe("recent league schedule PDF", () => {
  it("groups local calendar dates ascending and orders matches by hour", () => {
    const groups = groupProgramacionByLocalDate([
      pdfMatch(match("late", "2026-08-02T21:00:00")),
      pdfMatch(match("next", "2026-08-03T10:00:00")),
      pdfMatch(match("early", "2026-08-02T08:00:00")),
    ])

    expect(groups.map((group) => group.key)).toEqual(["2026-08-02", "2026-08-03"])
    expect(groups[0].partidos.map(({ partido }) => partido.id)).toEqual(["early", "late"])
  })

  it("puts null and invalid dates in an undated group last", () => {
    const groups = groupProgramacionByLocalDate([
      pdfMatch(match("null", null)),
      pdfMatch(match("dated", "2026-08-02T08:00:00")),
      pdfMatch(match("invalid", "not-a-date")),
    ])

    expect(groups.map((group) => group.key)).toEqual(["2026-08-02", "sin-fecha"])
    expect(groups[1].label).toBe("Fecha por definir")
    expect(groups[1].partidos.map(({ partido }) => partido.id)).toEqual(["null", "invalid"])
  })

  it("escapes every dynamic HTML field", () => {
    const recentJornada = jornada([match("x", "2026-08-02T08:00:00", "A&B <script>")])
    recentJornada.numero = 2
    const data = schedule([{ id: "d", nombre: "Primera <A>", categoria: { id: "cat", nombre: "Libre & <Mayor>" }, jornadas: [recentJornada] }])
    data.nombre = 'Liga "Central" & Co'
    data.divisiones[0].jornadas[0].partidos[0].cancha!.nombre = "Cancha 'Norte'"

    const html = programacionRecienteHtml(data)
    expect(html).toContain("Liga &quot;Central&quot; &amp; Co")
    expect(html).toContain("Primera &lt;A&gt;")
    expect(html).toContain("Libre &amp; &lt;Mayor&gt;")
    expect(html).toContain("A&amp;B &lt;script&gt;")
    expect(html).toContain("Cancha &#39;Norte&#39;")
    expect(html).not.toContain("<script>")
  })

  it("combines divisions on the same date with exact columns and continuous pagination", () => {
    const html = programacionRecienteHtml(schedule([
      division("one", "Primera", [match("one", "2026-08-02T08:00:00")], "Mayor"),
      division("two", "Segunda", [match("two", "2026-08-02T10:00:00")], "Juvenil"),
    ]))

    expect(html.match(/class="date-group"/g)).toHaveLength(1)
    expect(html).toContain("<th>Hora</th><th>Jornada</th><th>División</th><th>Categoría</th><th>Cancha</th><th>Local</th><th>Visitante</th>")
    expect(html).toContain("Primera")
    expect(html).toContain("Segunda")
    expect(html).not.toMatch(/division-page|break-before|page-break-before/)
    expect(html).toContain("thead { display: table-header-group; }")
    expect(html).toContain("tr { break-inside: avoid; page-break-inside: avoid; }")
    expect(html).not.toMatch(/table \{[^}]*break-inside/)
  })

  it("orders dates globally and puts undated matches last", () => {
    const html = programacionRecienteHtml(schedule([
      division("later", "Segunda", [match("later", "2026-08-03T08:00:00")]),
      division("undated", "Tercera", [match("undated", null)]),
      division("earlier", "Primera", [match("earlier", "2026-08-01T08:00:00")]),
    ]))

    const dateHeadings = [...html.matchAll(/<h3>(.*?)<\/h3>/g)].map((result) => result[1])
    expect(dateHeadings).toHaveLength(3)
    expect(dateHeadings[2]).toBe("Fecha por definir")
    expect(html.indexOf("Primera")).toBeLessThan(html.indexOf("Segunda"))
    expect(html.indexOf("Segunda")).toBeLessThan(html.indexOf("Tercera"))
  })

  it("omits empty divisions and all referee data", () => {
    const partido = match("x", "2026-08-02T08:00:00") as ProgramacionRecientePartidoDto & { arbitros: { id: string; nombre: string }[] }
    partido.arbitros = [{ id: "a", nombre: "Árbitro Secreto" }]
    const html = programacionRecienteHtml(schedule([
      { id: "empty", nombre: "División Vacía", categoria: { id: "cat-empty", nombre: "Vacía" }, jornadas: [] },
      division("scheduled", "Primera", [partido]),
    ]))

    expect(html).not.toContain("División Vacía")
    expect(html).not.toContain("Árbitros")
    expect(html).not.toContain("Árbitro Secreto")
  })

  it("requires at least one match before generating the PDF", () => {
    expect(hasProgramacionReciente(schedule([
      { id: "empty", nombre: "Juvenil", categoria: { id: "c1", nombre: "Libre" }, jornadas: [] },
      division("without-matches", "Primera", []),
    ]))).toBe(false)
    expect(hasProgramacionReciente(schedule([
      division("scheduled", "Segunda", [match("x", null)]),
    ]))).toBe(true)
  })
})
