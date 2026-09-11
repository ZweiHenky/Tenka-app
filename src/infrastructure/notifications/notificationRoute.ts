import type { Href } from "expo-router"

const SEGMENT = "([^/?#]+)"

type NotificationPathname =
  | "/(public)/liga/[id]"
  | "/(public)/equipo/[id]"
  | "/(public)/jugador/[id]"
  | "/(drawer)/team/[id]"
  | "/(drawer)/team/[id]/divisions/[divisionId]"
  | "/(drawer)/leagues/[id]"
  | "/(drawer)/leagues/[id]/divisions/[divisionId]"
  | "/(drawer)/leagues/[id]/divisions/[divisionId]/jornadas/[jornadaId]"
  | "/(drawer)/leagues/[id]/divisions/[divisionId]/partidos/[partidoId]"

const notificationRoutes: { pattern: RegExp; pathname: NotificationPathname; paramNames: string[] }[] = [
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?(?:\\(public\\)/)?liga/${SEGMENT}$`), pathname: "/(public)/liga/[id]", paramNames: ["id"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?(?:\\(public\\)/)?equipo/${SEGMENT}$`), pathname: "/(public)/equipo/[id]", paramNames: ["id"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?(?:\\(public\\)/)?jugador/${SEGMENT}$`), pathname: "/(public)/jugador/[id]", paramNames: ["id"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?player/${SEGMENT}$`), pathname: "/(public)/jugador/[id]", paramNames: ["id"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?team/${SEGMENT}$`), pathname: "/(drawer)/team/[id]", paramNames: ["id"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?team/${SEGMENT}/divisions/${SEGMENT}$`), pathname: "/(drawer)/team/[id]/divisions/[divisionId]", paramNames: ["id", "divisionId"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?leagues/${SEGMENT}$`), pathname: "/(drawer)/leagues/[id]", paramNames: ["id"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?leagues/${SEGMENT}/divisions/${SEGMENT}$`), pathname: "/(drawer)/leagues/[id]/divisions/[divisionId]", paramNames: ["id", "divisionId"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?leagues/${SEGMENT}/divisions/${SEGMENT}/jornadas/${SEGMENT}$`), pathname: "/(drawer)/leagues/[id]/divisions/[divisionId]/jornadas/[jornadaId]", paramNames: ["id", "divisionId", "jornadaId"] },
  { pattern: new RegExp(`^/(?:\\(drawer\\)/)?leagues/${SEGMENT}/divisions/${SEGMENT}/partidos/${SEGMENT}$`), pathname: "/(drawer)/leagues/[id]/divisions/[divisionId]/partidos/[partidoId]", paramNames: ["id", "divisionId", "partidoId"] },
]

export function parseNotificationHref(value: unknown): Href | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("#")) return null

  const queryIndex = value.indexOf("?")
  const path = queryIndex === -1 ? value : value.slice(0, queryIndex)
  const query = queryIndex === -1 ? "" : value.slice(queryIndex + 1)

  for (const route of notificationRoutes) {
    const match = route.pattern.exec(path)
    if (!match) continue

    try {
      const params: Record<string, string> = {}
      route.paramNames.forEach((name, index) => {
        const decoded = decodeURIComponent(match[index + 1])
        if (!decoded || decoded === "." || decoded === ".." || decoded.includes("/")) throw new Error("Invalid route segment")
        params[name] = decoded
      })

      const searchParams = new URLSearchParams(query)
      if (path.includes("/liga/") && [...searchParams.keys()].every((key) => key === "divisionId" || key === "tab")) {
        const divisionId = searchParams.get("divisionId")
        const tab = searchParams.get("tab")
        if (divisionId) params.divisionId = divisionId
        if (tab) params.tab = tab
      } else if (query) {
        return null
      }

      return { pathname: route.pathname, params } as Href
    } catch {
      return null
    }
  }

  return null
}
