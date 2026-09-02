import { afterEach, describe, expect, it, vi } from "vitest"
import {
  LOCATION_MAX_AGE_MS,
  LOCATION_REQUIRED_ACCURACY_M,
  LocationResolutionError,
  formatLocationLabel,
  normalizeCoordinates,
  resolveNearbyCoordinates,
} from "./location-policy"

describe("nearby location policy", () => {
  afterEach(() => vi.useRealTimers())

  it("normalizes coordinates to the same precision used by request and cache", () => {
    expect(normalizeCoordinates(19.43264, -99.13324)).toEqual({ latitude: 19.433, longitude: -99.133 })
    expect(normalizeCoordinates(0, 0)).toEqual({ latitude: 0, longitude: 0 })
  })

  it("prefers a recent known location", async () => {
    const adapter = {
      hasServicesEnabled: vi.fn().mockResolvedValue(true),
      getLastKnown: vi.fn().mockResolvedValue({ coords: { latitude: 19.4326, longitude: -99.1332 } }),
      getCurrent: vi.fn(),
    }

    await expect(resolveNearbyCoordinates(adapter)).resolves.toEqual({ latitude: 19.433, longitude: -99.133 })
    expect(adapter.getLastKnown).toHaveBeenCalledWith({ maxAge: LOCATION_MAX_AGE_MS, requiredAccuracy: LOCATION_REQUIRED_ACCURACY_M })
    expect(adapter.getCurrent).not.toHaveBeenCalled()
  })

  it("falls back to a current location", async () => {
    const adapter = {
      hasServicesEnabled: vi.fn().mockResolvedValue(true),
      getLastKnown: vi.fn().mockResolvedValue(null),
      getCurrent: vi.fn().mockResolvedValue({ coords: { latitude: 20, longitude: -100 } }),
    }

    await expect(resolveNearbyCoordinates(adapter)).resolves.toEqual({ latitude: 20, longitude: -100 })
  })

  it("forces a current reading when refreshing after movement", async () => {
    const adapter = {
      hasServicesEnabled: vi.fn().mockResolvedValue(true),
      getLastKnown: vi.fn().mockResolvedValue({ coords: { latitude: 19, longitude: -99 } }),
      getCurrent: vi.fn().mockResolvedValue({ coords: { latitude: 20, longitude: -100 } }),
    }

    await expect(resolveNearbyCoordinates(adapter, { forceCurrent: true })).resolves.toEqual({ latitude: 20, longitude: -100 })
    expect(adapter.getLastKnown).not.toHaveBeenCalled()
  })

  it("formats municipality and state without duplicating equal names", () => {
    expect(formatLocationLabel({ district: "Cuauhtémoc", region: "Ciudad de México" })).toBe("Cuauhtémoc, Ciudad de México")
    expect(formatLocationLabel({ city: "Monterrey", region: "Nuevo León" })).toBe("Monterrey, Nuevo León")
    expect(formatLocationLabel({ city: "Ciudad de México", region: "Ciudad de México" })).toBe("Ciudad de México")
    expect(formatLocationLabel(undefined)).toBeUndefined()
  })

  it("distinguishes disabled services", async () => {
    const adapter = {
      hasServicesEnabled: vi.fn().mockResolvedValue(false),
      getLastKnown: vi.fn(),
      getCurrent: vi.fn(),
    }

    await expect(resolveNearbyCoordinates(adapter)).rejects.toMatchObject({ kind: "services-disabled" })
  })

  it("times out instead of blocking the feed", async () => {
    vi.useFakeTimers()
    const adapter = {
      hasServicesEnabled: vi.fn().mockResolvedValue(true),
      getLastKnown: vi.fn().mockResolvedValue(null),
      getCurrent: vi.fn(() => new Promise<never>(() => {})),
    }
    const pending = resolveNearbyCoordinates(adapter)
    const assertion = expect(pending).rejects.toEqual(new LocationResolutionError("timeout"))
    await vi.runAllTimersAsync()

    await assertion
  })
})
