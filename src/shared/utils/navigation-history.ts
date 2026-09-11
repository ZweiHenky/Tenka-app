interface NavigationRouteLike {
  name: string
  params?: Record<string, unknown>
  state?: NavigationStateLike
}

export interface NavigationStateLike {
  routes: readonly NavigationRouteLike[]
}

export function hasRouteInHistory(
  state: NavigationStateLike | undefined,
  routeName: string,
  params: Record<string, string>,
): boolean {
  if (!state) return false

  return state.routes.some((route) => {
    const paramsMatch = Object.entries(params).every(([key, value]) => String(route.params?.[key]) === value)
    return (route.name === routeName && paramsMatch) || hasRouteInHistory(route.state, routeName, params)
  })
}
