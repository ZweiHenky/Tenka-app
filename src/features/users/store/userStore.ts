import { create } from "zustand"
import type { User } from "@/domain/interfaces/user"

interface UserState {
  users: User[]
  selectedUser: User | null
  isLoading: boolean
  setUsers: (users: User[]) => void
  setSelectedUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  isLoading: false,
  setUsers: (users) => set({ users }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setLoading: (isLoading) => set({ isLoading }),
}))
