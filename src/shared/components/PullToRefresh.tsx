import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { RefreshControl, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native"
import Animated from "react-native-reanimated"
import { Palette } from "@/constants/theme"

interface Props {
  onRefresh: () => void
  refreshing: boolean
  threshold?: number
  onEndReached?: () => void
  onEndReachedThreshold?: number
  children: ReactNode
  scrollRef?: React.RefObject<Animated.ScrollView>
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void
}

export default function PullToRefresh({ onRefresh, refreshing, onEndReached, onEndReachedThreshold = 400, children, scrollRef, onScroll }: Props) {
  const endReachedRef = useRef<(() => void) | undefined>(undefined)
  const nearBottom = useRef(false)
  const thresholdRef = useRef(onEndReachedThreshold)
  const externalOnScroll = useRef<((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined>(undefined)

  useEffect(() => {
    endReachedRef.current = onEndReached
    thresholdRef.current = onEndReachedThreshold
  }, [onEndReached, onEndReachedThreshold])

  useEffect(() => {
    externalOnScroll.current = onScroll
  }, [onScroll])

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent
    const fn = endReachedRef.current
    const threshold = thresholdRef.current
    if (fn
      && !nearBottom.current
      && contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold
      && contentSize.height > layoutMeasurement.height) {
      nearBottom.current = true
      fn()
    } else if (contentOffset.y + layoutMeasurement.height < contentSize.height - threshold) {
      nearBottom.current = false
    }
    externalOnScroll.current?.(e)
  }, [])

  return (
    <Animated.ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      bounces
      overScrollMode="always"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Palette.cyan}
          colors={[Palette.cyan]}
          progressBackgroundColor={Palette.dark}
        />
      }
    >
      {children}
    </Animated.ScrollView>
  )
}
