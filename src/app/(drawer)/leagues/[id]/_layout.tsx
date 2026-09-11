import { Stack } from "expo-router"

export const unstable_settings = {
  initialRouteName: "index",
}

export default function LeagueDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="division-form" />
      <Stack.Screen name="manage" />
      <Stack.Screen name="divisions/[divisionId]" />
      <Stack.Screen name="divisions/[divisionId]/jornadas/[jornadaId]" />
      <Stack.Screen name="divisions/[divisionId]/partidos/[partidoId]" />
      <Stack.Screen name="divisions/[divisionId]/teams/[teamId]" />
    </Stack>
  )
}
