import { useEffect, useRef, useState } from "react"
import { router } from "expo-router"
import { OneSignal } from "react-native-onesignal"
import type { PushSubscriptionChangedState, UserChangedState } from "react-native-onesignal"
import { authClient } from "@/infrastructure/auth/client"
import { useDivisionNotificationStore } from "@/stores/divisionNotificationStore"
import { notificationSubscriptionApi } from "@/features/notification/api/notificationSubscription"
import { parseNotificationHref } from "./notificationRoute"
import { nonemptyId, syncNotificationIdentity } from "./notificationIdentity"
import { initializeOneSignal } from "./oneSignalRuntime"
import { getRetryAfterSeconds, isRateLimitError } from "@/infrastructure/api/rate-limit"

async function syncCurrentFollows(follows: { divisionId: string }[], userIdentity: string | null) {
  const [oneSignalId, pushSubscriptionId] = await Promise.all([
    OneSignal.User.getOnesignalId(),
    OneSignal.User.pushSubscription.getIdAsync(),
  ])
  await syncNotificationIdentity({
    currentId: nonemptyId(oneSignalId),
    pushSubscriptionId: nonemptyId(pushSubscriptionId),
    userIdentity,
    follows,
    sync: (data) => notificationSubscriptionApi.sync(data),
  })
}

export function NotificationBootstrap() {
  const { data: session, error: sessionError, isPending } = authClient.useSession()
  const subscriptions = useDivisionNotificationStore((s) => s.subscriptions)
  const subscriptionsRef = useRef(subscriptions)
  const userIdentityRef = useRef<string | null>(session?.user?.id ?? null)
  const [sdkReady, setSdkReady] = useState(false)
  const [storeHydrated, setStoreHydrated] = useState(() => useDivisionNotificationStore.persist.hasHydrated())

  useEffect(() => {
    subscriptionsRef.current = subscriptions
  }, [subscriptions])

  useEffect(() => {
    userIdentityRef.current = session?.user?.id ?? null
  }, [session?.user?.id])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSdkReady(initializeOneSignal()))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (storeHydrated) return
    return useDivisionNotificationStore.persist.onFinishHydration(() => setStoreHydrated(true))
  }, [storeHydrated])

  useEffect(() => {
    if (!sdkReady || !storeHydrated) return

    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    const synchronize = async (label: string, retry = true) => {
      try {
        await syncCurrentFollows(subscriptionsRef.current, userIdentityRef.current)
      } catch (error) {
        if (retry && isRateLimitError(error) && !cancelled) {
          if (!retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = undefined
              void synchronize(label, false)
            }, (getRetryAfterSeconds(error) ?? 60) * 1000)
          }
          return
        }
        console.warn(`[OneSignal] ${label} failed`, error)
      }
    }

    const onUserStateChange = async (_event: UserChangedState) => {
      await synchronize("device subscription sync")
    }
    const onPushSubscriptionChange = async (_event: PushSubscriptionChangedState) => {
      await synchronize("push subscription sync")
    }

    OneSignal.User.addEventListener("change", onUserStateChange)
    OneSignal.User.pushSubscription.addEventListener("change", onPushSubscriptionChange)
    return () => {
      OneSignal.User.removeEventListener("change", onUserStateChange)
      OneSignal.User.pushSubscription.removeEventListener("change", onPushSubscriptionChange)
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [sdkReady, storeHydrated])

  useEffect(() => {
    if (!sdkReady || !storeHydrated || isPending) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    const synchronize = async () => {
      if (session?.user?.id) await Promise.resolve(OneSignal.login(session.user.id))
      else await Promise.resolve(OneSignal.logout())
      await syncCurrentFollows(subscriptionsRef.current, session?.user?.id ?? null)
    }
    const run = (retry = true) => void synchronize().catch((error) => {
      if (retry && isRateLimitError(error) && !cancelled) {
        retryTimer = setTimeout(() => run(false), (getRetryAfterSeconds(error) ?? 60) * 1000)
        return
      }
      console.warn("[OneSignal] login or device subscription sync failed", error)
    })
    run()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [isPending, sdkReady, session?.user?.id, sessionError, storeHydrated])

  useEffect(() => {
    if (!sdkReady) return

    const onClick = (event: any) => {
      const href = parseNotificationHref(event?.notification?.additionalData?.url)
      if (href) router.navigate(href, { withAnchor: true })
    }

    OneSignal.Notifications.addEventListener("click", onClick)
    return () => {
      OneSignal.Notifications.removeEventListener("click", onClick)
    }
  }, [sdkReady])

  return null
}
