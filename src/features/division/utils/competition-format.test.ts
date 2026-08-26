import { describe, expect, it } from "vitest"
import { capabilitiesFor, capabilitiesForDivision, divisionTabs, formatFromCodigo, hayPartidosDeEliminatoria, publicDivisionTabs } from "./competition-format"

describe("formatFromCodigo", () => {
  it("reconoce los dos formatos", () => {
    expect(formatFromCodigo("ELIMINATORIA")).toBe("ELIMINATORIA")
    expect(formatFromCodigo("LIGA_Y_ELIMINATORIAS")).toBe("LIGA_Y_ELIMINATORIAS")
  })

  // Esconder pestañas ocultaría datos que sí existen; mostrar de más no rompe nada.
  it.each([undefined, null, "", "OTRA_COSA", "eliminatoria"])(
    "cae al formato completo con un código no reconocido (%s)",
    (codigo) => {
      expect(formatFromCodigo(codigo)).toBe("LIGA_Y_ELIMINATORIAS")
    },
  )
})

describe("capabilitiesFor", () => {
  it("la liga tiene fase de liga y todas las pestañas", () => {
    const caps = capabilitiesFor("LIGA_Y_ELIMINATORIAS")
    expect(caps.faseLiga).toBe(true)
    expect(caps.tabs).toEqual(["equipos", "programacion", "jornadas", "posiciones", "goleo", "eliminatorias"])
    expect(caps.siembraPorDefecto).toBe("POSICIONES")
  })

  it("el cuadro puro no muestra posiciones ni jornadas", () => {
    const caps = capabilitiesFor("ELIMINATORIA")
    expect(caps.faseLiga).toBe(false)
    expect(caps.eliminatorias).toBe(true)
    expect(caps.tabs).not.toContain("posiciones")
    expect(caps.tabs).not.toContain("jornadas")
    expect(caps.siembraPorDefecto).toBe("ALEATORIA")
  })

  it("los dos formatos tienen eliminatorias", () => {
    expect(capabilitiesFor("LIGA_Y_ELIMINATORIAS").eliminatorias).toBe(true)
    expect(capabilitiesFor("ELIMINATORIA").eliminatorias).toBe(true)
  })
})

describe("capabilitiesForDivision", () => {
  const catalogo = [
    { id: "t1", nombre: "Liga y Eliminatorias", codigo: "LIGA_Y_ELIMINATORIAS" },
    { id: "t2", nombre: "Eliminatoria", codigo: "ELIMINATORIA" },
  ]

  it("resuelve por id contra el catálogo", () => {
    expect(capabilitiesForDivision(catalogo, "t2").faseLiga).toBe(false)
    expect(capabilitiesForDivision(catalogo, "t1").faseLiga).toBe(true)
  })

  // Pasa mientras el lookup carga: el catálogo todavía está vacío.
  it("con el catálogo vacío da el formato completo", () => {
    expect(capabilitiesForDivision([], "t2").faseLiga).toBe(true)
  })

  it("una entrada de catálogo sin código se trata como liga", () => {
    expect(capabilitiesForDivision([{ id: "t3", nombre: "Algo" }], "t3").faseLiga).toBe(true)
  })
})

describe("hayPartidosDeEliminatoria", () => {
  /**
   * La distinción que motiva el helper: el cuadro se mide por **partidos**, no por rondas. Contar
   * rondas dibujaba la pestaña sobre un cuadro vacío.
   */
  it("rondas sin partidos no son un cuadro", () => {
    expect(hayPartidosDeEliminatoria([{ partidos: [] }, { partidos: [] }])).toBe(false)
  })

  it("basta con que una ronda tenga partidos", () => {
    expect(hayPartidosDeEliminatoria([{ partidos: [] }, { partidos: [{}] }])).toBe(true)
  })

  it("sin rondas tampoco hay cuadro", () => {
    expect(hayPartidosDeEliminatoria([])).toBe(false)
  })
})

describe("divisionTabs", () => {
  it("con el goleo encendido y cuadro deja las pestañas del formato tal cual", () => {
    expect(divisionTabs(capabilitiesFor("LIGA_Y_ELIMINATORIAS").tabs, true, true))
      .toEqual(["equipos", "programacion", "jornadas", "posiciones", "goleo", "eliminatorias"])
    expect(divisionTabs(capabilitiesFor("ELIMINATORIA").tabs, true, true))
      .toEqual(["equipos", "programacion", "eliminatorias", "goleo"])
  })

  it("apagado quita Goleo en los dos formatos y no toca las demás", () => {
    expect(divisionTabs(capabilitiesFor("LIGA_Y_ELIMINATORIAS").tabs, false, true))
      .toEqual(["equipos", "programacion", "jornadas", "posiciones", "eliminatorias"])
    expect(divisionTabs(capabilitiesFor("ELIMINATORIA").tabs, false, true))
      .toEqual(["equipos", "programacion", "eliminatorias"])
  })

  /**
   * Antes la pestaña estaba siempre en la pantalla administrativa. Esconderla no deja nada
   * inalcanzable: "Generar eliminatorias" vive en el menú de opciones.
   */
  it("sin cuadro quita Eliminatoria en los dos formatos", () => {
    expect(divisionTabs(capabilitiesFor("LIGA_Y_ELIMINATORIAS").tabs, true, false))
      .toEqual(["equipos", "programacion", "jornadas", "posiciones", "goleo"])
    expect(divisionTabs(capabilitiesFor("ELIMINATORIA").tabs, true, false))
      .toEqual(["equipos", "programacion", "goleo"])
  })

  it("los dos interruptores son independientes", () => {
    expect(divisionTabs(capabilitiesFor("LIGA_Y_ELIMINATORIAS").tabs, false, false))
      .toEqual(["equipos", "programacion", "jornadas", "posiciones"])
  })
})

describe("publicDivisionTabs", () => {
  it("con fase de liga y cuadro están las cinco, y Posiciones antes que Eliminatoria", () => {
    expect(publicDivisionTabs(true, true)).toEqual(["info", "posiciones", "eliminatoria", "horario", "goleo"])
  })

  // Es el pedido: en un cuadro puro la tabla queda en cero para siempre.
  it("un cuadro puro no muestra Posiciones", () => {
    expect(publicDivisionTabs(false, true)).toEqual(["info", "eliminatoria", "horario", "goleo"])
  })

  it("una liga sin cuadro generado no muestra Eliminatoria", () => {
    expect(publicDivisionTabs(true, false)).toEqual(["info", "posiciones", "horario", "goleo"])
  })

  it("sin fase de liga y sin cuadro quedan las tres de siempre", () => {
    expect(publicDivisionTabs(false, false)).toEqual(["info", "horario", "goleo"])
  })

  it("con el goleo apagado esa pestaña no aparece", () => {
    expect(publicDivisionTabs(true, true, false)).toEqual(["info", "posiciones", "eliminatoria", "horario"])
    expect(publicDivisionTabs(false, false, false)).toEqual(["info", "horario"])
  })

  // Una respuesta vieja sin el campo no debe apagar la pestaña: ante la duda se muestra de más.
  it("omitir el argumento equivale a tenerlo encendido", () => {
    expect(publicDivisionTabs(true, true)).toEqual(publicDivisionTabs(true, true, true))
  })
})
