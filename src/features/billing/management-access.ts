import type { ManagementAccess } from "@/domain/interfaces/league"

export type ManagementSurface = "MANAGE" | "READ_ONLY" | "PAYWALL"

export function managementSurface(access?: ManagementAccess): ManagementSurface {
  if (!access || access === "FULL" || access === "LIMITED_SETUP") return "MANAGE"
  return access === "READ_ONLY" ? "READ_ONLY" : "PAYWALL"
}
