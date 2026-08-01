import { afterEach, describe, expect, it, vi } from "vitest"
import { formatLocalTime, toLocalDateKey } from "../date-time"

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
