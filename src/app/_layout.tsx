import "../../global.css"
import { useEffect } from "react"
import { Pressable, Text, TextInput, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { Stack, type ErrorBoundaryProps } from "expo-router"
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        return failureCount < 1 && (status === undefined || status >= 500)
      },
    },
  },
})

/**
 * El primer componente del `componentStack`, que es el que realmente falló.
 *
 * Sin esto la pantalla solo mostraba el mensaje, y averiguar qué componente reventó en un build
 * instalado exigía conectar el teléfono y leer `adb logcat`. El dato ya viaja en el error.
 */
function componenteQueFallo(error: unknown): string | null {
  const stack = (error as { componentStack?: string })?.componentStack
  const despuesDelPrimerAt = stack?.split("at ")[1]
  return despuesDelPrimerAt?.split(" ")[0]?.trim() || null
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const componente = componenteQueFallo(error)
  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text className="text-center text-2xl font-bold text-foreground">Algo salio mal</Text>
      <Text className="mt-3 text-center text-base text-muted-foreground">{error.message}</Text>
      {componente ? (
        <Text selectable className="mt-2 text-center text-xs text-muted-foreground">en {componente}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        className="mt-6 rounded-xl bg-primary px-6 py-3"
        onPress={retry}
      >
        <Text className="font-semibold text-primary-foreground">Intentar de nuevo</Text>
      </Pressable>
    </View>
  )
}

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
