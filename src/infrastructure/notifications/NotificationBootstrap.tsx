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

export function NotificationBootstrap() {
  const { data: session, isPending } = authClient.useSession()
  const subscriptions = useDivisionNotificationStore((s) => s.subscriptions)
  const onesignalIdRef = useRef<string | null>(null)
  const subscriptionsRef = useRef(subscriptions)

  useEffect(() => {
    subscriptionsRef.current = subscriptions
  }, [subscriptions])

  useEffect(() => {
    if (!env.ONESIGNAL_APP_ID) return

    OneSignal.Debug.setLogLevel(LogLevel.Warn)
    OneSignal.initialize(env.ONESIGNAL_APP_ID)

    if (Platform.OS === "android") {
      OneSignal.Notifications.requestPermission(false)
    }
  }, [])

  useEffect(() => {
    if (!env.ONESIGNAL_APP_ID) return
    if (isPending) return
    if (session?.user?.id) {
      OneSignal.login(session.user.id)
    } else {
      OneSignal.logout()
    }
  }, [isPending, session?.user?.id])

  useEffect(() => {
    if (!env.ONESIGNAL_APP_ID) return

    const onUserStateChange = async (event: UserChangedState) => {
      const newId = event.current.onesignalId ?? null
      if (!newId || newId === onesignalIdRef.current) return
      onesignalIdRef.current = newId

      const active = subscriptionsRef.current
      if (active.length === 0) return

      const pushSubscriptionId = await OneSignal.User.pushSubscription.getIdAsync()
      for (const sub of active) {
        try {
          await notificationSubscriptionApi.subscribe({
            divisionId: sub.divisionId,
            oneSignalId: newId,
            pushSubscriptionId,
          })
          OneSignal.User.addTag(`division_${sub.divisionId}`, "true")
        } catch (e) {
          console.warn("[OneSignal] re-sync failed for", sub.divisionId, e)
        }
      }
    }

    OneSignal.User.addEventListener("change", onUserStateChange)
    return () => {
      OneSignal.User.removeEventListener("change", onUserStateChange)
    }
  }, [])

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
