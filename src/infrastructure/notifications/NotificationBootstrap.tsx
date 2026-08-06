import { useEffect, useRef } from "react"
import { Platform } from "react-native"
import { router } from "expo-router"
import { OneSignal, LogLevel } from "react-native-onesignal"
import type { UserChangedState } from "react-native-onesignal"
import { authClient } from "@/infrastructure/auth/client"
import { env } from "../config/env"
import { useDivisionNotificationStore } from "@/stores/divisionNotificationStore"
import { notificationSubscriptionApi } from "@/features/notification/api/notificationSubscription"
import { parseNotificationHref } from "./notificationRoute"
import { nonemptyId, syncNotificationIdentity } from "./notificationIdentity"

async function syncCurrentFollows(follows: { divisionId: string }[]) {
  const [oneSignalId, pushSubscriptionId] = await Promise.all([
    OneSignal.User.getOnesignalId(),
    OneSignal.User.pushSubscription.getIdAsync(),
  ])
  await syncNotificationIdentity({
    currentId: nonemptyId(oneSignalId),
    pushSubscriptionId: nonemptyId(pushSubscriptionId),
    follows,
    subscribe: (data) => notificationSubscriptionApi.subscribe(data),
  })
}

export function NotificationBootstrap() {
  const { data: session, isPending } = authClient.useSession()
  const subscriptions = useDivisionNotificationStore((s) => s.subscriptions)
  const subscriptionsRef = useRef(subscriptions)

  useEffect(() => {
    subscriptionsRef.current = subscriptions
  }, [subscriptions])

  useEffect(() => {
    if (!env.ONESIGNAL_APP_ID) return

    OneSignal.Debug.setLogLevel(LogLevel.Warn)
    OneSignal.initialize(env.ONESIGNAL_APP_ID)

    if (Platform.OS === "android") {
      void Promise.resolve(OneSignal.Notifications.requestPermission(false)).catch((error) => {
        console.warn("[OneSignal] permission request failed", error)
      })
    }
  }, [])

  useEffect(() => {
    if (!env.ONESIGNAL_APP_ID) return

    const onUserStateChange = async (_event: UserChangedState) => {
      await syncCurrentFollows(subscriptionsRef.current).catch((error) => {
        console.warn("[OneSignal] device subscription sync failed", error)
      })
    }

    OneSignal.User.addEventListener("change", onUserStateChange)
    return () => {
      OneSignal.User.removeEventListener("change", onUserStateChange)
    }
  }, [])

  useEffect(() => {
    if (!env.ONESIGNAL_APP_ID || isPending) return
    const synchronize = async () => {
      if (session?.user?.id) await Promise.resolve(OneSignal.login(session.user.id))
      else await Promise.resolve(OneSignal.logout())
      await syncCurrentFollows(subscriptionsRef.current)
    }
    void synchronize().catch((error) => {
      console.warn("[OneSignal] login or device subscription sync failed", error)
    })
  }, [isPending, session?.user?.id])

  useEffect(() => {
    if (!env.ONESIGNAL_APP_ID) return

    const onClick = (event: any) => {
      const href = parseNotificationHref(event?.notification?.additionalData?.url)
      if (href) router.navigate(href)
    }

    OneSignal.Notifications.addEventListener("click", onClick)
    return () => {
      OneSignal.Notifications.removeEventListener("click", onClick)
    }
  }, [])

  return null
}
