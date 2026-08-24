import { useEffect, useRef } from "react"
import { useTourGuide, type TourStep } from "@wrack/react-native-tour-guide"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tourConfig, tourYaCompletado } from "@/shared/utils/tour-config"

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
      const yaVisto = await tourYaCompletado(tourId)
      if (cancelled) return
      if (yaVisto) {
        tourStartedRef.current = true
        tourCheckingRef.current = false
        return
      }

      tourTimerRef.current = setTimeout(() => {
        if (cancelled || isActive) return
        tourStartedRef.current = true
        tourCheckingRef.current = false
        startTour(
          steps,
          tourConfig({ tourId, insets, onTourEnd, scrollRef, getCurrentScrollOffset }),
        )
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
    tourId, steps, startTour, insets,
    onTourEnd, scrollRef, getCurrentScrollOffset,
  ])
}
