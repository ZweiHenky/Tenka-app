import { Stack } from "expo-router"

export default function LeaguesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="league-form" />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
