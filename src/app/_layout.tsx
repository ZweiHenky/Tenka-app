import "../../global.css"
import { useEffect } from "react"
import { LogBox, Text, TextInput } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { Stack } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { TourGuideProvider, TourGuideOverlay } from "@wrack/react-native-tour-guide"
import * as SplashScreen from "expo-splash-screen"
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter"
import { Sora_600SemiBold, Sora_700Bold } from "@expo-google-fonts/sora"
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Fonts } from "@/constants/theme"
import { ToastProvider } from "@/shared/components/Toast"
import { NotificationBootstrap } from "@/infrastructure/notifications/NotificationBootstrap"

SplashScreen.preventAutoHideAsync()

LogBox.ignoreLogs(["InteractionManager has been deprecated"])

const queryClient = new QueryClient()

export default function RootLayout() {
  const insets = useSafeAreaInsets()
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Sora_600SemiBold,
    Sora_700Bold,
    SpaceGrotesk_600SemiBold,
  })

  useEffect(() => {
    if (!loaded) return
    const T = Text as any
    const TI = TextInput as any
    T.defaultProps = { ...T.defaultProps, style: { fontFamily: Fonts.sans } }
    TI.defaultProps = { ...TI.defaultProps, style: { fontFamily: Fonts.sans } }
    SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, paddingBottom: insets.bottom }}>
      <TourGuideProvider>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(drawer)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(public)" />
            </Stack>
            <NotificationBootstrap />
          </BottomSheetModalProvider>
          <TourGuideOverlay />
          </KeyboardProvider>
        </QueryClientProvider>
      </ToastProvider>
      </TourGuideProvider>
    </GestureHandlerRootView>
  )
}
