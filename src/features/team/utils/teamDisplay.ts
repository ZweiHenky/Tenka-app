export function getTeamCode(teamId: string): string {
  return teamId.replace(/[^a-z0-9]/gi, "").slice(-4).padStart(4, "0").toUpperCase()
}

export function normalizeTeamDisplayName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es")
}

export function getDuplicateTeamNames(teams: { nombre: string }[]): Set<string> {
  const counts = new Map<string, number>()
  for (const team of teams) {
    const name = normalizeTeamDisplayName(team.nombre)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name))
}
