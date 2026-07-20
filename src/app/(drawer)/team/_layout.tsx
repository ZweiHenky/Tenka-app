import { Stack } from "expo-router"

export default function TeamLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="team-form" />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
