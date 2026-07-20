import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView, type BottomSheetModalMethods, type BottomSheetProps } from "@gorhom/bottom-sheet"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface Props {
  visible: boolean
  onClose: () => void
  title?: string
  snapPoints?: Array<string | number>
  children: ReactNode
  contentPadding?: boolean
  scrollable?: boolean
  stackBehavior?: BottomSheetProps["stackBehavior"]
  enableContentPanningGesture?: boolean
}

export default function AppBottomSheetModal({
  visible,
  onClose,
  title,
  snapPoints,
  children,
  contentPadding = true,
  scrollable = true,
  stackBehavior,
  enableContentPanningGesture = true,
}: Props) {
  const insets = useSafeAreaInsets()
  const ref = useRef<BottomSheetModalMethods>(null)
  const points = useMemo(() => snapPoints ?? ["50%"], [snapPoints])
  const [mounted, setMounted] = useState(visible)
  const closingRef = useRef(false)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      closingRef.current = false
      const frame = requestAnimationFrame(() => ref.current?.present())
      return () => cancelAnimationFrame(frame)
    }

    if (mounted) {
      closingRef.current = true
      ref.current?.dismiss()
    }
  }, [visible, mounted])

  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
  ), [])

  const handleDismiss = () => {
    setMounted(false)
    if (closingRef.current) {
      closingRef.current = false
      return
    }
    onClose()
  }

  if (!mounted) return null

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      stackBehavior={stackBehavior}
      enablePanDownToClose
      enableContentPanningGesture={enableContentPanningGesture}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleIndicatorStyle={{ backgroundColor: Palette.borderActive, width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: Palette.dark, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border }}
    >
      {scrollable ? (
        <BottomSheetScrollView
          contentContainerStyle={contentPadding ? { padding: Pad.xl, paddingTop: title ? Pad.sm : Pad.xl, paddingBottom: insets.bottom + Pad.xl, gap: Gap.md } : undefined}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {title ? <Text style={{ fontSize: 18, fontFamily: Fonts.display, color: Palette.text }}>{title}</Text> : null}
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={contentPadding ? { padding: Pad.xl, paddingTop: title ? Pad.sm : Pad.xl, paddingBottom: insets.bottom + Pad.xl, gap: Gap.md } : undefined}>
          {title ? <Text style={{ fontSize: 18, fontFamily: Fonts.display, color: Palette.text }}>{title}</Text> : null}
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  )
}
