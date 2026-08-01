import { useEffect, useRef } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide, type TourStep } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Palette, Radius } from "@/constants/theme"

interface UseTourOptions {
  tourId: string
  isFocused: boolean
  isBlocked: boolean
  isEnabled: boolean
  allRefsReady: boolean
  steps: TourStep[]
  scrollRef?: React.RefObject<any>
  getCurrentScrollOffset?: () => number
  onTourEnd?: () => void
}

export function useTour({
  tourId,
  isFocused,
  isBlocked,
  isEnabled,
  allRefsReady,
  steps,
  scrollRef,
  getCurrentScrollOffset,
  onTourEnd,
}: UseTourOptions) {
  const { startTour, endTour, isActive, activeTourId } = useTourGuide()
  const insets = useSafeAreaInsets()
  const tourStartedRef = useRef(false)
  const tourCheckingRef = useRef(false)
  const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const asyncStorageKey = `@tour_guide:${tourId}`

  useEffect(() => {
    if ((!isFocused || isBlocked) && isActive && activeTourId === tourId) {
      endTour()
      onTourEnd?.()
    }
  }, [isFocused, isBlocked, isActive, activeTourId, tourId, endTour, onTourEnd])

  useEffect(() => {
    if (!isFocused || isBlocked || !isEnabled || !allRefsReady || isActive) return
    if (tourStartedRef.current || tourCheckingRef.current) return

    let cancelled = false
    tourCheckingRef.current = true

    const initTour = async () => {
      const seen = await AsyncStorage.getItem(asyncStorageKey)
      if (cancelled) return
      if (seen === "completed") {
        tourStartedRef.current = true
        tourCheckingRef.current = false
        return
      }

      tourTimerRef.current = setTimeout(() => {
        if (cancelled || isActive) return
        tourStartedRef.current = true
        tourCheckingRef.current = false
        startTour(steps, {
          tourId,
          insets: { top: insets.top, bottom: insets.bottom },
          nextButtonText: "Siguiente",
          prevButtonText: "Atrás",
          skipButtonText: "Saltar",
          doneButtonText: "Entendido",
          onTourEnd: () => {
            AsyncStorage.setItem(asyncStorageKey, "completed")
            onTourEnd?.()
          },
          tooltipStyles: {
            backgroundColor: Palette.surface,
            titleColor: Palette.text,
            descriptionColor: Palette.textSecondary,
            buttonTextColor: Palette.black,
            primaryButtonColor: Palette.cyan,
            skipButtonColor: Palette.textMuted,
            borderRadius: Radius.lg,
          },
          spotlightStyles: {
            overlayColor: Palette.black,
            overlayOpacity: 0.7,
          },
          ...(scrollRef ? { scrollRef, getCurrentScrollOffset } : {}),
        })
      }, 600)
    }

    initTour()

    return () => {
      cancelled = true
      if (tourTimerRef.current) {
        clearTimeout(tourTimerRef.current)
        tourTimerRef.current = null
      }
      if (!tourStartedRef.current) tourCheckingRef.current = false
    }
  }, [
    isFocused, isBlocked, isEnabled, allRefsReady, isActive,
    tourId, steps, startTour, insets.top, insets.bottom,
    onTourEnd, scrollRef, getCurrentScrollOffset,
    asyncStorageKey,
  ])
}
