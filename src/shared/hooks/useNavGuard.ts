import { useCallback, useRef } from "react"

export function useNavGuard(ms = 600) {
  const lastTapRef = useRef(0)
  return useCallback(
    (fn: () => void) => {
      const now = Date.now()
      if (now - lastTapRef.current < ms) return
      lastTapRef.current = now
      fn()
    },
    [ms]
  )
}
