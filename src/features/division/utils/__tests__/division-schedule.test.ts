import { describe, expect, it } from "vitest"
import type { LigaCanchaRef } from "@/domain/interfaces/league"
import {
  resolveCourtSchedules,
  scheduleForCourt,
  unionOfPlayDays,
  type DivisionScheduleSource,
} from "../division-schedule"

const canchas: LigaCanchaRef[] = [
  { id: "c1", nombre: "Cancha 1", activa: true },
  { id: "c2", nombre: "Cancha 2", activa: true },
]

const base: DivisionScheduleSource = {
  diasPartido: "lun, jue",
  horarioPartido: "18:00 - 20:00",
  canchaHorarios: [],
}

describe("resolveCourtSchedules", () => {
  it("usa los escalares cuando la liga no tiene canchas", () => {
    const resolved = resolveCourtSchedules(base, [])
    expect([...resolved.keys()]).toEqual([undefined])
    expect(resolved.get(undefined)!.horarioPartido).toBe("18:00 - 20:00")
  })

  it("da a cada cancha configurada su propio horario", () => {
    const division = {
      ...base,
      canchaHorarios: [
        { canchaId: "c1", diasPartido: "lun", horarioPartido: "18:00 - 20:00" },
        { canchaId: "c2", diasPartido: "jue", horarioPartido: "20:00 - 22:00" },
      ],
    }
    const resolved = resolveCourtSchedules(division, canchas)
    expect(resolved.get("c1")!.horarioPartido).toBe("18:00 - 20:00")
    expect(resolved.get("c2")!.diasPartido).toBe("jue")
  })

  it("omite una cancha sin fila: la división no juega ahí", () => {
    const division = {
      ...base,
      canchaHorarios: [{ canchaId: "c1", diasPartido: "lun", horarioPartido: "18:00 - 20:00" }],
    }
    expect(resolveCourtSchedules(division, canchas).has("c2")).toBe(false)
  })

  it("descarta filas de canchas inactivas", () => {
    const division = {
      ...base,
      canchaHorarios: [{ canchaId: "c1", diasPartido: "lun", horarioPartido: "18:00 - 20:00" }],
    }
    const mixed: LigaCanchaRef[] = [
      { id: "c1", nombre: "Cancha 1", activa: false },
      { id: "c2", nombre: "Cancha 2", activa: true },
    ]
    const resolved = resolveCourtSchedules(division, mixed)
    expect(resolved.has("c1")).toBe(false)
    expect(resolved.has("c2")).toBe(true)
  })

  it("sin filas replica los escalares en todas las canchas activas", () => {
    const resolved = resolveCourtSchedules(base, canchas)
    expect([...resolved.keys()].sort()).toEqual(["c1", "c2"])
  })
})

describe("scheduleForCourt", () => {
  it("devuelve el horario de esa cancha", () => {
    const division = {
      ...base,
      canchaHorarios: [
        { canchaId: "c1", diasPartido: "lun", horarioPartido: "18:00 - 20:00" },
        { canchaId: "c2", diasPartido: "jue", horarioPartido: "20:00 - 22:00" },
      ],
    }
    expect(scheduleForCourt(division, canchas, "c2").horarioPartido).toBe("20:00 - 22:00")
  })

  it("cae al resumen para una cancha no configurada", () => {
    const division = {
      ...base,
      canchaHorarios: [{ canchaId: "c1", diasPartido: "lun", horarioPartido: "18:00 - 20:00" }],
    }
    expect(scheduleForCourt(division, canchas, "c2").horarioPartido).toBe("18:00 - 20:00")
  })

  it("usa el horario por defecto sin división", () => {
    expect(scheduleForCourt(null, [], undefined).horarioPartido).toBe("08:00-20:00")
  })
})

describe("unionOfPlayDays", () => {
  it("une los días de todas las canchas", () => {
    const division = {
      ...base,
      canchaHorarios: [
        { canchaId: "c1", diasPartido: "lun", horarioPartido: "18:00 - 20:00" },
        { canchaId: "c2", diasPartido: "jue", horarioPartido: "20:00 - 22:00" },
      ],
    }
    expect(unionOfPlayDays(division, canchas)).toEqual([1, 4])
  })

  it("sin filas usa los días de los escalares", () => {
    expect(unionOfPlayDays(base, canchas)).toEqual([1, 4])
  })
})
