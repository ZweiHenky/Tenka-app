import { Stack } from "expo-router"

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="liga/[id]" />
      <Stack.Screen name="equipo/[id]" />
      <Stack.Screen name="jugador/[id]" />
    </Stack>
  )
}
