import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"

export interface DivisionNotificationItem {
  divisionId: string
  ligaId: string
  ligaNombre: string
  divisionNombre: string
}

interface DivisionNotificationState {
  subscriptions: DivisionNotificationItem[]
  toggle: (item: DivisionNotificationItem) => void
  remove: (divisionId: string) => void
  isSubscribed: (divisionId: string) => boolean
}

export const useDivisionNotificationStore = create<DivisionNotificationState>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      toggle: (item) =>
        set((s) => ({
          subscriptions: s.subscriptions.some((f) => f.divisionId === item.divisionId)
            ? s.subscriptions.filter((f) => f.divisionId !== item.divisionId)
            : [...s.subscriptions, item],
        })),
      remove: (divisionId) =>
        set((s) => ({ subscriptions: s.subscriptions.filter((f) => f.divisionId !== divisionId) })),
      isSubscribed: (divisionId) => get().subscriptions.some((f) => f.divisionId === divisionId),
    }),
    {
      name: "division-notifications",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
