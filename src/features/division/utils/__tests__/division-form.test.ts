import { describe, expect, it } from "vitest"
import type { Division, LigaCanchaRef } from "@/domain/interfaces/league"
import {
  buildDivisionPayload,
  EMPTY_DIVISION_FORM,
  hydrateDivisionForm,
  perCourtRows,
  validateDivisionForm,
  type DivisionFormState,
} from "../division-form"

const canchas: LigaCanchaRef[] = [
  { id: "c1", nombre: "Cancha 1", activa: true },
  { id: "c2", nombre: "Cancha 2", activa: true },
]

const division = {
  id: "div-1",
  nombre: "Primera",
  maxEquipos: 8,
  arbitraje: 0,
  diasPartido: "L, J",
  horarioPartido: "18:00 - 22:00",
  duracionPartido: 60,
  descanso: 0,
  fechaInicio: null,
  createdAt: "",
  updatedAt: "",
  ligaId: "liga-1",
  estadoLigaId: "estado-1",
  categoriaId: "categoria-1",
  tipoId: "tipo-1",
  tipoCompetenciaId: "competencia-1",
  registrarParticipaciones: false,
  usarPenalesEnEmpates: true,
} as Division

const validForm: DivisionFormState = {
  ...EMPTY_DIVISION_FORM,
  nombre: "Primera",
  maxEquipos: "8",
  arbitraje: "0",
  duracionPartido: "60",
  descanso: "0",
  categoriaId: "categoria-1",
  tipoId: "tipo-1",
  tipoCompetenciaId: "competencia-1",
  diasPartido: "L",
  horarioPartido: "18:00 - 20:00",
}

describe("hydrateDivisionForm", () => {
  it("arranca en modo compartido cuando la división no tiene filas por cancha", () => {
    const form = hydrateDivisionForm(division, canchas)
    expect(form.mismoHorarioTodasLasCanchas).toBe(true)
    expect(form.diasPartido).toBe("L, J")
    expect(Object.keys(form.porCancha).sort()).toEqual(["c1", "c2"])
    expect(form.porCancha.c1.juega).toBe(false)
  })

  it("arranca en modo por cancha e hidrata cada tarjeta cuando hay filas", () => {
    const form = hydrateDivisionForm({
      ...division,
      canchaHorarios: [{ canchaId: "c2", diasPartido: "J", horarioPartido: "20:00 - 22:00" }],
    }, canchas)

    expect(form.mismoHorarioTodasLasCanchas).toBe(false)
    expect(form.porCancha.c2).toEqual({ juega: true, diasPartido: "J", horarioPartido: "20:00 - 22:00" })
    // Sin fila = la división no juega ahí.
    expect(form.porCancha.c1.juega).toBe(false)
  })

  it("al crear deja una tarjeta vacía por cancha", () => {
    const form = hydrateDivisionForm(null, canchas)
    expect(form.nombre).toBe("")
    expect(form.porCancha.c1).toEqual({ juega: false, diasPartido: "", horarioPartido: "" })
  })
})

describe("perCourtRows", () => {
  it("solo incluye las canchas activadas", () => {
    const form: DivisionFormState = {
      ...validForm,
      porCancha: {
        c1: { juega: true, diasPartido: "L", horarioPartido: "18:00 - 20:00" },
        c2: { juega: false, diasPartido: "J", horarioPartido: "20:00 - 22:00" },
      },
    }
    expect(perCourtRows(form)).toEqual([{ canchaId: "c1", diasPartido: "L", horarioPartido: "18:00 - 20:00" }])
  })
})

describe("validateDivisionForm", () => {
  it("acepta un formulario completo en modo compartido", () => {
    expect(validateDivisionForm(validForm, canchas)).toBeNull()
  })

  it("exige duración de partido", () => {
    expect(validateDivisionForm({ ...validForm, duracionPartido: "" }, canchas))
      .toMatch(/Duración del partido/)
  })

  it("exige al menos una cancha activada en modo por cancha", () => {
    const form = { ...validForm, mismoHorarioTodasLasCanchas: false }
    expect(validateDivisionForm(form, canchas)).toBe("Activa al menos una cancha para esta división")
  })

  it("nombra la cancha cuando el error es de una en concreto", () => {
    const form: DivisionFormState = {
      ...validForm,
      mismoHorarioTodasLasCanchas: false,
      porCancha: {
        c1: { juega: true, diasPartido: "L", horarioPartido: "18:00 - 20:00" },
        c2: { juega: true, diasPartido: "", horarioPartido: "20:00 - 22:00" },
      },
    }
    expect(validateDivisionForm(form, canchas)).toBe("Selecciona al menos un día de partido en Cancha 2")
  })

  it("rechaza un rango que no alcanza para un partido", () => {
    const form = { ...validForm, duracionPartido: "90", horarioPartido: "18:00 - 19:00" }
    expect(validateDivisionForm(form, canchas)).toMatch(/no alcanza para un partido completo/)
  })

  it("no valida el horario compartido cuando está en modo por cancha", () => {
    const form: DivisionFormState = {
      ...validForm,
      diasPartido: "",
      horarioPartido: "",
      mismoHorarioTodasLasCanchas: false,
      porCancha: { c1: { juega: true, diasPartido: "L", horarioPartido: "18:00 - 20:00" } },
    }
    expect(validateDivisionForm(form, canchas)).toBeNull()
  })
})

describe("buildDivisionPayload", () => {
  it("manda los escalares en modo compartido al crear, sin tocar las filas", () => {
    const payload = buildDivisionPayload(validForm, { ligaId: "liga-1", isEdit: false })
    expect(payload.diasPartido).toBe("L")
    expect(payload.horarioPartido).toBe("18:00 - 20:00")
    expect(payload).not.toHaveProperty("horariosPorCancha")
  })

  it("al editar en modo compartido manda un arreglo vacío para borrar las filas", () => {
    const payload = buildDivisionPayload(validForm, { ligaId: "liga-1", isEdit: true })
    expect(payload.horariosPorCancha).toEqual([])
    expect(payload.diasPartido).toBe("L")
  })

  it("en modo por cancha manda las filas y omite los escalares", () => {
    const form: DivisionFormState = {
      ...validForm,
      mismoHorarioTodasLasCanchas: false,
      porCancha: {
        c1: { juega: true, diasPartido: "L", horarioPartido: "18:00 - 20:00" },
        c2: { juega: false, diasPartido: "", horarioPartido: "" },
      },
    }
    const payload = buildDivisionPayload(form, { ligaId: "liga-1", isEdit: true })
    expect(payload.horariosPorCancha).toEqual([{ canchaId: "c1", diasPartido: "L", horarioPartido: "18:00 - 20:00" }])
    expect(payload).not.toHaveProperty("diasPartido")
    expect(payload).not.toHaveProperty("horarioPartido")
  })

  it("recorta el nombre y normaliza los numéricos", () => {
    const payload = buildDivisionPayload({ ...validForm, nombre: "  Primera  ", arbitraje: "" }, { ligaId: "liga-1", isEdit: false })
    expect(payload.nombre).toBe("Primera")
    expect(payload.maxEquipos).toBe(8)
    expect(payload.arbitraje).toBe(0)
  })
})

describe("el formato se fija al crear", () => {
  const form = { ...EMPTY_DIVISION_FORM, nombre: "A", maxEquipos: "8", tipoCompetenciaId: "t1", categoriaId: "c1", tipoId: "ti1", diasPartido: "L", horarioPartido: "18:00 - 20:00", duracionPartido: "60" }

  it("lo manda al crear", () => {
    expect(buildDivisionPayload(form, { ligaId: "l1", isEdit: false }).tipoCompetenciaId).toBe("t1")
  })

  // Mandarlo en edición permitiría cambiar el formato desde un cliente manipulado y dejar la
  // división con jornadas o rondas de un formato que ya no aplica.
  it("no lo manda al editar", () => {
    expect(buildDivisionPayload(form, { ligaId: "l1", isEdit: true })).not.toHaveProperty("tipoCompetenciaId")
  })
})
