export type UserRole = "CAPITAN" | "LIGA" | "ADMINISTRADOR"

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  rol?: UserRole
}

export const canCreateLeague = (role?: UserRole) => role === "LIGA" || role === "ADMINISTRADOR"

export const canCreateTeam = (role?: UserRole) => role === "CAPITAN" || role === "LIGA" || role === "ADMINISTRADOR"
