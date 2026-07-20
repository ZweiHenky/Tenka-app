import { create } from "zustand"
import type { User } from "@/domain/interfaces/user"

interface ProfileState {
  profile: User | null
  isEditing: boolean
  setProfile: (profile: User | null) => void
  setEditing: (isEditing: boolean) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isEditing: false,
  setProfile: (profile) => set({ profile }),
  setEditing: (isEditing) => set({ isEditing }),
}))
