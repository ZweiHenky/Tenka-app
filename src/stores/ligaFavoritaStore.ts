import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"

export interface LigaFavoritaItem {
  id: string
  nombre: string
  cancha: string | null
  logo: string | null
}

interface LigaFavoritaState {
  favoritos: LigaFavoritaItem[]
  toggle: (item: LigaFavoritaItem) => void
  remove: (ligaId: string) => void
  esFavorito: (ligaId: string) => boolean
}

export const useLigaFavoritaStore = create<LigaFavoritaState>()(
  persist(
    (set, get) => ({
      favoritos: [],
      toggle: (item) =>
        set((s) => ({
          favoritos: s.favoritos.some((f) => f.id === item.id)
            ? s.favoritos.filter((f) => f.id !== item.id)
            : [...s.favoritos, item],
        })),
      remove: (ligaId) =>
        set((s) => ({ favoritos: s.favoritos.filter((f) => f.id !== ligaId) })),
      esFavorito: (ligaId) => get().favoritos.some((f) => f.id === ligaId),
    }),
    {
      name: "ligas-favoritas",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
