import { useCallback, useEffect, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import { Platform, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView, type BottomSheetBackdropProps, type BottomSheetModalProps } from "@gorhom/bottom-sheet"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"

interface Props {
  visible: boolean
  onClose: () => void
  title?: string
  snapPoints?: (string | number)[]
  children: ReactNode
  contentPadding?: boolean
  scrollable?: boolean
  stackBehavior?: BottomSheetModalProps["stackBehavior"]
  enableContentPanningGesture?: boolean
  dismissible?: boolean
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
  dismissible = true,
}: Props) {
  const insets = useSafeAreaInsets()
  const bottomContentInset = Math.max(insets.bottom, Platform.OS === "android" ? 32 : 0)
  const ref = useRef<BottomSheetModal>(null)
  const points = useMemo(() => snapPoints ?? ["50%"], [snapPoints])
  const suppressDismissRef = useRef(false)
  const previousVisibleRef = useRef(false)

  useEffect(() => {
    const wasVisible = previousVisibleRef.current
    previousVisibleRef.current = visible

    if (visible) {
      const frame = requestAnimationFrame(() => ref.current?.present())
      return () => cancelAnimationFrame(frame)
    }

    if (wasVisible) {
      suppressDismissRef.current = true
      ref.current?.dismiss()
    }
  }, [visible])

  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior={dismissible ? "close" : "none"} />
  ), [dismissible])

  const handleDismiss = () => {
    if (suppressDismissRef.current) {
      suppressDismissRef.current = false
      return
    }
    previousVisibleRef.current = false
    onClose()
  }

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      stackBehavior={stackBehavior}
      enablePanDownToClose={dismissible}
      enableContentPanningGesture={enableContentPanningGesture}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleIndicatorStyle={{ backgroundColor: Palette.borderActive, width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: Palette.dark, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: Palette.border }}
    >
      {scrollable ? (
        <BottomSheetScrollView
          contentContainerStyle={contentPadding ? { padding: Pad.xl, paddingTop: title ? Pad.sm : Pad.xl, paddingBottom: bottomContentInset + Pad.xl, gap: Gap.md } : undefined}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {title ? <Text style={{ fontSize: 18, fontFamily: Fonts.display, color: Palette.text }}>{title}</Text> : null}
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={contentPadding ? { padding: Pad.xl, paddingTop: title ? Pad.sm : Pad.xl, paddingBottom: bottomContentInset + Pad.xl, gap: Gap.md } : undefined}>
          {title ? <Text style={{ fontSize: 18, fontFamily: Fonts.display, color: Palette.text }}>{title}</Text> : null}
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  )
}
