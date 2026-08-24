import { describe, expect, it } from "vitest"
import { campeonSugerido, conSugeridoPrimero, cuadroCompleto, faltaCampeon, goleadorSugerido, ladoGanador, ultimaRonda } from "./campeon"
import type { PartidoDeCuadro } from "./campeon"

function partido(over: Partial<PartidoDeCuadro> = {}): PartidoDeCuadro {
  return {
    estado: "FINALIZADO",
    golesLocal: 0,
    golesVisitante: 0,
    equipoLocalId: "local",
    equipoVisitanteId: "visitante",
    equipoLocal: { id: "local", nombre: "Cuauhtémoc", logo: null },
    equipoVisitante: { id: "visitante", nombre: "Halcones", logo: null },
    ...over,
  }
}

describe("ladoGanador", () => {
  it("gana quien metió más goles", () => {
    expect(ladoGanador(partido({ golesLocal: 2, golesVisitante: 1 }))).toBe("LOCAL")
    expect(ladoGanador(partido({ golesLocal: 1, golesVisitante: 3 }))).toBe("VISITANTE")
  })

  it("desempata por penales", () => {
    expect(ladoGanador(partido({ golesLocal: 1, golesVisitante: 1, penalesLocal: 4, penalesVisitante: 2 }))).toBe("LOCAL")
    expect(ladoGanador(partido({ golesLocal: 1, golesVisitante: 1, penalesLocal: 2, penalesVisitante: 4 }))).toBe("VISITANTE")
  })

  // Un cuadro mal capturado no debe inventar un campeón.
  it("sin ganador si el empate no tiene penales, o si los penales también empatan", () => {
    expect(ladoGanador(partido({ golesLocal: 1, golesVisitante: 1 }))).toBeNull()
    expect(ladoGanador(partido({ golesLocal: 1, golesVisitante: 1, penalesLocal: 3, penalesVisitante: 3 }))).toBeNull()
  })

  it("sin ganador mientras el partido no esté finalizado", () => {
    expect(ladoGanador(partido({ estado: "PROGRAMADO", golesLocal: 2, golesVisitante: 1 }))).toBeNull()
    expect(ladoGanador(partido({ estado: null, golesLocal: 2, golesVisitante: 1 }))).toBeNull()
  })
})

describe("ultimaRonda", () => {
  // El nombre del catálogo es editable por API; el orden no.
  it("es la de orden máximo, no la que se llama Final", () => {
    const rondas = [{ orden: 1, nombre: "Final" }, { orden: 3, nombre: "Cierre" }, { orden: 2, nombre: "Semifinal" }]
    expect(ultimaRonda(rondas)?.nombre).toBe("Cierre")
  })

  it("es null sin rondas", () => {
    expect(ultimaRonda([])).toBeNull()
  })
})

describe("cuadroCompleto", () => {
  it("solo con todos los partidos de la última ronda terminados", () => {
    expect(cuadroCompleto([{ orden: 1, partidos: [partido()] }])).toBe(true)
    expect(cuadroCompleto([{ orden: 1, partidos: [partido(), partido({ estado: "PROGRAMADO" })] }])).toBe(false)
  })

  // Una ronda vacía no es un torneo terminado.
  it("es falso sin rondas y con la última ronda sin partidos", () => {
    expect(cuadroCompleto([])).toBe(false)
    expect(cuadroCompleto([{ orden: 1, partidos: [] }])).toBe(false)
  })

  it("ignora las rondas anteriores, que ya se jugaron", () => {
    const rondas = [
      { orden: 1, partidos: [partido({ estado: "SUSPENDIDO" })] },
      { orden: 2, partidos: [partido({ golesLocal: 2, golesVisitante: 0 })] },
    ]
    expect(cuadroCompleto(rondas)).toBe(true)
  })
})

describe("campeonSugerido", () => {
  it("es el ganador de la ronda de orden máximo", () => {
    const rondas = [
      { orden: 1, partidos: [partido(), partido()] },
      { orden: 2, partidos: [partido({ golesLocal: 0, golesVisitante: 2 })] },
    ]
    expect(campeonSugerido(rondas)).toEqual({ equipoId: "visitante", nombre: "Halcones" })
  })

  it("sugiere al ganador por penales", () => {
    const rondas = [{ orden: 1, partidos: [partido({ golesLocal: 1, golesVisitante: 1, penalesLocal: 5, penalesVisitante: 4 })] }]
    expect(campeonSugerido(rondas)).toEqual({ equipoId: "local", nombre: "Cuauhtémoc" })
  })

  // Sin una final única no hay un solo campeón del que hablar; que elija el dueño.
  it("no sugiere nada si la última ronda tiene más de un partido", () => {
    const rondas = [{ orden: 1, partidos: [partido({ golesLocal: 2 }), partido({ golesLocal: 3 })] }]
    expect(campeonSugerido(rondas)).toBeNull()
  })

  it("no sugiere nada con la final sin jugar, empatada o sin rondas", () => {
    expect(campeonSugerido([{ orden: 1, partidos: [partido({ estado: "PROGRAMADO", golesLocal: 2 })] }])).toBeNull()
    expect(campeonSugerido([{ orden: 1, partidos: [partido({ golesLocal: 1, golesVisitante: 1 })] }])).toBeNull()
    expect(campeonSugerido([])).toBeNull()
  })

  it("no sugiere un equipo que ya no existe en el partido", () => {
    const rondas = [{ orden: 1, partidos: [partido({ golesLocal: 2, equipoLocalId: null, equipoLocal: undefined })] }]
    expect(campeonSugerido(rondas)).toBeNull()
  })
})

describe("goleadorSugerido", () => {
  it("es la primera fila, que el servidor ya ordenó por goles", () => {
    const rows = [{ jugadorId: "a", nombre: "Ronaldo", goles: 12 }, { jugadorId: "b", nombre: "Ana", goles: 9 }]
    expect(goleadorSugerido(rows)?.jugadorId).toBe("a")
  })

  // Los goles sin jugador vivo no se pueden premiar: el backend los rechaza.
  it("salta las filas de jugadores borrados", () => {
    const rows = [{ jugadorId: null, nombre: "Borrado", goles: 20 }, { jugadorId: "b", nombre: "Ana", goles: 9 }]
    expect(goleadorSugerido(rows)?.jugadorId).toBe("b")
  })

  it("es null sin tabla de goleo", () => {
    expect(goleadorSugerido([])).toBeNull()
  })
})

describe("faltaCampeon", () => {
  const terminado = [{ orden: 1, partidos: [partido({ golesLocal: 2, golesVisitante: 0 })] }]
  const pendiente = [{ orden: 1, partidos: [partido({ estado: "PROGRAMADO" })] }]

  it("es cierto solo con el cuadro cerrado y sin campeón", () => {
    expect(faltaCampeon(terminado, null)).toBe(true)
  })

  it("es falso cuando el campeón ya está asignado", () => {
    expect(faltaCampeon(terminado, { id: "c1" })).toBe(false)
  })

  it("es falso con la final pendiente y sin cuadro", () => {
    expect(faltaCampeon(pendiente, null)).toBe(false)
    expect(faltaCampeon([], null)).toBe(false)
  })
})

describe("conSugeridoPrimero", () => {
  const equipos = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]

  /** El caso que motiva el helper: en una división de veinte, el sugerido quedaba al final. */
  it("sube al sugerido al frente", () => {
    expect(conSugeridoPrimero(equipos, "d").map((e) => e.id)).toEqual(["d", "a", "b", "c"])
  })

  /**
   * La otra mitad del comportamiento: solo se mueve uno. Reordenar la lista entera rompería el
   * orden que la pantalla ya eligió para los demás.
   */
  it("los demás conservan su orden relativo", () => {
    expect(conSugeridoPrimero(equipos, "c").map((e) => e.id)).toEqual(["c", "a", "b", "d"])
  })

  it("el que ya era primero se queda donde está", () => {
    expect(conSugeridoPrimero(equipos, "a").map((e) => e.id)).toEqual(["a", "b", "c", "d"])
  })

  it("sin sugerencia la lista sale intacta", () => {
    expect(conSugeridoPrimero(equipos, null).map((e) => e.id)).toEqual(["a", "b", "c", "d"])
    expect(conSugeridoPrimero(equipos, undefined).map((e) => e.id)).toEqual(["a", "b", "c", "d"])
  })

  /** Un equipo dado de baja entre que se calculó la sugerencia y se abrió el selector. */
  it("una sugerencia ausente no altera ni duplica", () => {
    expect(conSugeridoPrimero(equipos, "zzz").map((e) => e.id)).toEqual(["a", "b", "c", "d"])
  })
})
