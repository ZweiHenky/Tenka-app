import { describe, expect, it } from "vitest"
import { equiposComprometidos, permiteRepetirEquipo } from "./slot-repeticion"

describe("permiteRepetirEquipo", () => {
  it("los partidos extra dejan repetir", () => {
    expect(permiteRepetirEquipo("complemento")).toBe(true)
    expect(permiteRepetirEquipo("amistoso")).toBe(true)
  })

  /** Un regular se guarda sin `tipo`, así que el ausente tiene que comportarse como regular. */
  it("regular y eliminatoria no, tampoco el tipo ausente", () => {
    expect(permiteRepetirEquipo("regular")).toBe(false)
    expect(permiteRepetirEquipo("eliminatoria")).toBe(false)
    expect(permiteRepetirEquipo(undefined)).toBe(false)
  })
})

describe("equiposComprometidos", () => {
  it("un equipo en un slot regular queda comprometido", () => {
    const slots = [{ equipoLocalId: "e0", equipoVisitanteId: "e1" }]
    expect([...equiposComprometidos(slots)].sort()).toEqual(["e0", "e1"])
  })

  /**
   * El caso que hacía desaparecer equipos del selector: el de "Puntos" quedaba comprometido y ya no
   * se ofrecía en ningún lado, ni siquiera para darle su propio partido regular.
   */
  it("ninguno de los dos lados de un complemento queda comprometido", () => {
    const slots = [{ tipo: "complemento", equipoLocalId: "e0", equipoVisitanteId: "e1" }]
    expect(equiposComprometidos(slots).size).toBe(0)
  })

  it("un amistoso tampoco compromete a nadie", () => {
    const slots = [{ tipo: "amistoso", equipoLocalId: "e0", equipoVisitanteId: "e1" }]
    expect(equiposComprometidos(slots).size).toBe(0)
  })

  it("la eliminatoria sí compromete", () => {
    const slots = [{ tipo: "eliminatoria", equipoLocalId: "e0", equipoVisitanteId: "e1" }]
    expect([...equiposComprometidos(slots)].sort()).toEqual(["e0", "e1"])
  })

  /** El equipo que repite: tiene su regular y además el complemento. El regular es el que cuenta. */
  it("solo el slot regular lo compromete, aunque también esté en un complemento", () => {
    const slots = [
      { equipoLocalId: "e0", equipoVisitanteId: "e5" },
      { tipo: "complemento", equipoLocalId: "e0", equipoVisitanteId: "e1" },
    ]
    expect([...equiposComprometidos(slots)].sort()).toEqual(["e0", "e5"])
  })
})
