import { beforeEach, describe, expect, it, vi } from "vitest"
import { useNearbyLocationPreferenceStore } from "../nearbyLocationPreferenceStore"

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

describe("nearbyLocationPreferenceStore", () => {
  beforeEach(() => {
    useNearbyLocationPreferenceStore.setState({ enabled: true, hasHydrated: true })
  })

  it("updates the local preference", () => {
    useNearbyLocationPreferenceStore.getState().setEnabled(false)

    expect(useNearbyLocationPreferenceStore.getState().enabled).toBe(false)
  })

  it("persists only whether nearby leagues are enabled", () => {
    const partialize = useNearbyLocationPreferenceStore.persist.getOptions().partialize
    const persisted = partialize?.(useNearbyLocationPreferenceStore.getState())

    expect(persisted).toEqual({ enabled: true })
    expect(persisted).not.toHaveProperty("hasHydrated")
  })
})
