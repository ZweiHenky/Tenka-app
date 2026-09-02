import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface NearbyLocationPreferenceState {
  enabled: boolean
  hasHydrated: boolean
  setEnabled: (enabled: boolean) => void
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useNearbyLocationPreferenceStore = create<NearbyLocationPreferenceState>()(
  persist(
    (set) => ({
      enabled: true,
      hasHydrated: false,
      setEnabled: (enabled) => set({ enabled }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "nearby-leagues-preference",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ enabled: state.enabled }) as NearbyLocationPreferenceState,
      onRehydrateStorage: (state) => () => state.setHasHydrated(true),
    },
  ),
)
