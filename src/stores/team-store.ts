import { create } from "zustand"
import type { Team } from "@/domain/interfaces/team"

const SEED: Team[] = [
  { id: "1", nombre: "Dragones FC", leagueId: "1", leagueName: "Apertura 2026", entrenador: "Carlos Ruiz", capitan: "Luis Mora", jugadores: 22, ciudad: "Zapopan", estado: "Jalisco", telefono: "3312345678", correo: "dragones@mail.com" },
  { id: "2", nombre: "Águilas Doradas", leagueId: "1", leagueName: "Apertura 2026", entrenador: "María López", capitan: "Ana Torres", jugadores: 20, ciudad: "Guadalajara", estado: "Jalisco", telefono: "3323456789", correo: "aguilas@mail.com" },
  { id: "3", nombre: "Titanes FC", leagueId: "1", leagueName: "Apertura 2026", entrenador: "Pedro García", capitan: "José Hernández", jugadores: 21, ciudad: "Zapopan", estado: "Jalisco", telefono: "3334567890" },
  { id: "4", nombre: "Rayadas", leagueId: "2", leagueName: "Clausura Femenil", entrenador: "Sofía Martínez", capitan: "Diana Reyes", jugadores: 18, ciudad: "Monterrey", estado: "Nuevo León", telefono: "8145678901", correo: "rayadas@mail.com" },
  { id: "5", nombre: "Leones FC", leagueId: "2", leagueName: "Clausura Femenil", entrenador: "Ana García", capitan: "Carla Sánchez", jugadores: 16, ciudad: "San Pedro", estado: "Nuevo León", telefono: "8156789012" },
]

let nextId = 6

interface TeamState {
  teams: Team[]
  selectedTeam: Team | null
  isLoading: boolean
  setSelectedTeam: (team: Team | null) => void
  setLoading: (loading: boolean) => void
  addTeam: (data: Omit<Team, "id">) => void
  updateTeam: (id: string, data: Partial<Omit<Team, "id">>) => void
  removeTeam: (id: string) => void
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: SEED,
  selectedTeam: null,
  isLoading: false,
  setSelectedTeam: (selectedTeam) => set({ selectedTeam }),
  setLoading: (isLoading) => set({ isLoading }),
  addTeam: (data) =>
    set((s) => ({ teams: [...s.teams, { id: String(nextId++), ...data }] })),
  updateTeam: (id, data) =>
    set((s) => ({
      teams: s.teams.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),
  removeTeam: (id) =>
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
}))
