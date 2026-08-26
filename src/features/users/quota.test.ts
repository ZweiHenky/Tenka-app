import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import {
  accountQuotaKey,
  increasesActiveDivisionCapacity,
  quotaCount,
  quotaIsExhausted,
  refreshQuotaAfterError,
  type AccountQuota,
} from "./quota"

const quota: AccountQuota = {
  role: "LIGA",
  limits: { teams: 2, leagues: null, divisions: 3, activeDivisions: 1 },
  usage: { teams: 2, leagues: 4, divisions: 2, activeDivisions: 1 },
}

describe("account quota rules", () => {
  it("only exhausts finite limits and formats unlimited usage", () => {
    expect(quotaIsExhausted(quota, "teams")).toBe(true)
    expect(quotaIsExhausted(quota, "leagues")).toBe(false)
    expect(quotaCount(quota, "leagues")).toBe("4 ligas · Sin límite")
  })

  it("guards only transitions that add active capacity", () => {
    expect(increasesActiveDivisionCapacity("BORRADOR", "EN_CURSO")).toBe(true)
    expect(increasesActiveDivisionCapacity("FINALIZADA", "EN_CURSO")).toBe(true)
    expect(increasesActiveDivisionCapacity("EN_CURSO", "EN_CURSO")).toBe(false)
    expect(increasesActiveDivisionCapacity("ABIERTA", "EN_CURSO")).toBe(false)
    expect(increasesActiveDivisionCapacity("EN_CURSO", "BORRADOR")).toBe(false)
  })

  it("refreshes quota only for stable quota codes", () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)

    expect(refreshQuotaAfterError(queryClient, { apiCode: "QUOTA_DIVISIONS_EXCEEDED" })).toBe(true)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountQuotaKey })
    expect(refreshQuotaAfterError(queryClient, { apiCode: "OTHER" })).toBe(false)
  })
})
