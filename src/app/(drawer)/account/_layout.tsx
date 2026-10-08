import { Stack } from "expo-router"
import { AuthGate } from "@/shared/components/AuthGate"

export const unstable_settings = {
  initialRouteName: "index",
}

export default function AccountLayout() {
  return (
    <AuthGate><Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="billing" />
      <Stack.Screen name="operational-control" />
    </Stack></AuthGate>
  )
}
