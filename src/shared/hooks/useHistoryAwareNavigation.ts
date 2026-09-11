import { useCallback } from "react"
import { router, type Href, useRootNavigationState } from "expo-router"
import { useNavGuard } from "@/shared/hooks/useNavGuard"
import { hasRouteInHistory, type NavigationStateLike } from "@/shared/utils/navigation-history"

export function useHistoryAwareNavigation() {
  const state = useRootNavigationState()
  const guard = useNavGuard()

  return useCallback((href: Href, routeName: string, params: Record<string, string>) => {
    guard(() => {
      if (hasRouteInHistory(state as NavigationStateLike | undefined, routeName, params)) {
        router.dismissTo(href)
      } else {
        router.push(href)
      }
    })
  }, [guard, state])
}
