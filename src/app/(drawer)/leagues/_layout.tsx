import { Stack } from "expo-router"
import { AuthGate } from "@/shared/components/AuthGate"

export default function LeaguesLayout() {
  return (
    <AuthGate><Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="league-form" />
      <Stack.Screen name="[id]" />
    </Stack></AuthGate>
  )
}
