import { Stack } from "expo-router"
import { AuthGate } from "@/shared/components/AuthGate"

export const unstable_settings = {
  initialRouteName: "index",
}

export default function MyProfileLayout() {
  return (
    <AuthGate><Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="form" />
    </Stack></AuthGate>
  )
}
