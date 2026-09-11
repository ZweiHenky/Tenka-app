import { describe, expect, it } from "vitest"
import { parseNotificationHref } from "./notificationRoute"

describe("parseNotificationHref", () => {
  it("maps the backend public league URL and its supported query params", () => {
    expect(parseNotificationHref("/(drawer)/(public)/liga/liga-1?divisionId=division-2&tab=horario")).toEqual({
      pathname: "/(public)/liga/[id]",
      params: { id: "liga-1", divisionId: "division-2", tab: "horario" },
    })
  })

  it("maps a supported match route to a typed route object", () => {
    expect(parseNotificationHref("/leagues/liga-1/divisions/div-2/partidos/partido-3")).toEqual({
      pathname: "/(drawer)/leagues/[id]/divisions/[divisionId]/partidos/[partidoId]",
      params: { id: "liga-1", divisionId: "div-2", partidoId: "partido-3" },
    })
  })

  it.each([
    "/jugador/jugador-1",
    "/(drawer)/player/jugador-1",
  ])("maps player links to the canonical public route: %s", (url) => {
    expect(parseNotificationHref(url)).toEqual({
      pathname: "/(public)/jugador/[id]",
      params: { id: "jugador-1" },
    })
  })

  it.each([
    "https://example.com/(drawer)/leagues/1",
    "//example.com/leagues/1",
    "/(drawer)/account",
    "/(drawer)/(public)/liga/1?redirect=https://example.com",
    "/(drawer)/(public)/liga/%2Faccount",
    "/(drawer)/(public)/liga/%E0%A4%A",
  ])("rejects unsupported or malformed routes: %s", (url) => {
    expect(parseNotificationHref(url)).toBeNull()
  })
})
