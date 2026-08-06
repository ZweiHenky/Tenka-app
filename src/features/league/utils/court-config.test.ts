import { describe, expect, it } from "vitest"
import { toCourtPayload, validateCourtConfig, type CourtDraft } from "./court-config"

const court = (key: string, nombre: string, activa = true, id?: string): CourtDraft => ({ key, nombre, activa, id })

describe("validateCourtConfig", () => {
  it("does not require active named courts when multiple courts are disabled", () => {
    expect(validateCourtConfig(false, [])).toBeNull()
    expect(validateCourtConfig(false, [court("1", "", true)])).toBeNull()
  })

  it("requires at least two active named courts when enabled", () => {
    expect(validateCourtConfig(true, [court("1", "Principal"), court("2", "Anexo", false)]))
      .toBe("Agrega al menos 2 canchas activas con nombre")
    expect(validateCourtConfig(true, [court("1", " Principal "), court("2", "Anexo")])).toBeNull()
  })

  it("rejects trimmed case-insensitive duplicate names", () => {
    expect(validateCourtConfig(true, [court("1", "Cancha Norte"), court("2", " cancha norte ")]))
      .toBe("Los nombres de las canchas no pueden repetirse")
  })
})

describe("toCourtPayload", () => {
  it("preserves persisted ids and inactive status while trimming names", () => {
    expect(toCourtPayload([
      court("existing", " Norte ", false, "court-1"),
      court("new", " Sur "),
      court("blank", ""),
    ])).toEqual([
      { id: "court-1", nombre: "Norte", activa: false },
      { nombre: "Sur", activa: true },
    ])
  })
})
