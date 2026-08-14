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
  const { data: session, isPending } = authClient.useSession()
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

    const onUserStateChange = async (_event: UserChangedState) => {
      await syncCurrentFollows(subscriptionsRef.current, userIdentityRef.current).catch((error) => {
        console.warn("[OneSignal] device subscription sync failed", error)
      })
    }
    const onPushSubscriptionChange = async (_event: PushSubscriptionChangedState) => {
      await syncCurrentFollows(subscriptionsRef.current, userIdentityRef.current).catch((error) => {
        console.warn("[OneSignal] push subscription sync failed", error)
      })
    }

    OneSignal.User.addEventListener("change", onUserStateChange)
    OneSignal.User.pushSubscription.addEventListener("change", onPushSubscriptionChange)
    return () => {
      OneSignal.User.removeEventListener("change", onUserStateChange)
      OneSignal.User.pushSubscription.removeEventListener("change", onPushSubscriptionChange)
    }
  }, [sdkReady, storeHydrated])

  useEffect(() => {
    if (!sdkReady || !storeHydrated || isPending) return
    const synchronize = async () => {
      if (session?.user?.id) await Promise.resolve(OneSignal.login(session.user.id))
      else await Promise.resolve(OneSignal.logout())
      await syncCurrentFollows(subscriptionsRef.current, session?.user?.id ?? null)
    }
    void synchronize().catch((error) => {
      console.warn("[OneSignal] login or device subscription sync failed", error)
    })
  }, [isPending, sdkReady, session?.user?.id, storeHydrated, subscriptions])

  useEffect(() => {
    if (!sdkReady) return

    const onClick = (event: any) => {
      const href = parseNotificationHref(event?.notification?.additionalData?.url)
      if (href) router.navigate(href)
    }

    OneSignal.Notifications.addEventListener("click", onClick)
    return () => {
      OneSignal.Notifications.removeEventListener("click", onClick)
    }
  }, [sdkReady])

  return null
}
