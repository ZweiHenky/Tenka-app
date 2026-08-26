import type { QueryClient } from "@tanstack/react-query"
import { hasApiErrorCode } from "@/infrastructure/api/errors"

export const accountQuotaKey = ["account-quota"] as const

export const accountQuotaQueryKey = (userId: string) => [...accountQuotaKey, userId] as const

export const QUOTA_ERROR_CODES = [
  "QUOTA_TEAMS_EXCEEDED",
  "QUOTA_LEAGUES_EXCEEDED",
  "QUOTA_DIVISIONS_EXCEEDED",
  "QUOTA_ACTIVE_DIVISIONS_EXCEEDED",
] as const

export type QuotaResource = "teams" | "leagues" | "divisions" | "activeDivisions"

export interface AccountQuota {
  role: string
  limits: Record<QuotaResource, number | null>
  usage: Record<QuotaResource, number>
}

const LABELS: Record<QuotaResource, string> = {
  teams: "equipos",
  leagues: "ligas",
  divisions: "divisiones",
  activeDivisions: "divisiones activas",
}

export function quotaIsExhausted(quota: AccountQuota | undefined, resource: QuotaResource): boolean {
  if (!quota) return false
  const limit = quota.limits[resource]
  return limit !== null && quota.usage[resource] >= limit
}

export function quotaCount(quota: AccountQuota, resource: QuotaResource): string {
  const limit = quota.limits[resource]
  return limit === null ? `${quota.usage[resource]} ${LABELS[resource]} · Sin límite` : `${quota.usage[resource]} de ${limit} ${LABELS[resource]}`
}

export function quotaExhaustedMessage(resource: QuotaResource): string {
  return `Alcanzaste el límite de ${LABELS[resource]} de tu cuenta.`
}

export function increasesActiveDivisionCapacity(currentCode: string | undefined, targetCode: string): boolean {
  const activeCodes = new Set(["ABIERTA", "EN_CURSO"])
  return !activeCodes.has(currentCode ?? "") && activeCodes.has(targetCode)
}

export function isQuotaError(error: unknown): boolean {
  return hasApiErrorCode(error, ...QUOTA_ERROR_CODES)
}

export function refreshQuotaAfterError(queryClient: QueryClient, error: unknown): boolean {
  if (!isQuotaError(error)) return false
  queryClient.invalidateQueries({ queryKey: accountQuotaKey })
  return true
}
