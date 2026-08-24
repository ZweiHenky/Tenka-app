import { afterEach, describe, expect, it, vi } from "vitest"
import { formatLocalTime, toLocalDateKey, formatMonthYear } from "../date-time"

describe("local match date helpers", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("uses the device-local day instead of truncating the UTC value", () => {
    vi.stubEnv("TZ", "America/Mexico_City")
    const iso = "2026-08-03T04:30:00.000Z"

    expect(toLocalDateKey(iso)).toBe("2026-08-02")
  })

  it("formats the same local time shown by the device", () => {
    vi.stubEnv("TZ", "America/Mexico_City")
    const iso = "2026-08-03T04:30:00.000Z"

    expect(formatLocalTime(iso)).toBe("22:30")
  })
})

describe("formatMonthYear", () => {
  it("devuelve mes y año en español", () => {
    const label = formatMonthYear("2026-03-14T18:00:00.000Z")
    expect(label).toContain("2026")
    expect(label.toLowerCase()).toContain("marzo")
  })

  it("no muestra el día: la fecha es cuándo se coronó, no cuándo se jugó la final", () => {
    expect(formatMonthYear("2026-03-14T18:00:00.000Z")).not.toMatch(/\b14\b/)
  })

  // Una fecha rota no debe escribir "Invalid Date" en la pantalla del palmarés.
  it.each(["", "no es una fecha", "2026-13-45"])("devuelve cadena vacía con %s", (entrada) => {
    expect(formatMonthYear(entrada)).toBe("")
  })
})
