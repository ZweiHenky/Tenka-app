import { Stack } from "expo-router"

export default function LeagueDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="division-form" />
      <Stack.Screen name="manage" />
      <Stack.Screen name="divisions/[divisionId]" />
      <Stack.Screen name="divisions/[divisionId]/eliminatorias" />
      <Stack.Screen name="divisions/[divisionId]/jornadas/[jornadaId]" />
      <Stack.Screen name="divisions/[divisionId]/jornadas/[jornadaId]/partidos/[partidoId]" />
    </Stack>
  )
}
