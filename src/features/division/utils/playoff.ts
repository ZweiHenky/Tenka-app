export const PLAYOFF_TEAM_OPTIONS = [2, 4, 8, 16, 32] as const

export function getPlayoffTeamOptions(assignedTeamCount: number): number[] {
  return PLAYOFF_TEAM_OPTIONS.filter((teamCount) => teamCount <= assignedTeamCount)
}

export function getPlayoffRoundMatchCounts(roundCount: number): number[] {
  if (!Number.isInteger(roundCount) || roundCount < 1) return []

  return Array.from({ length: roundCount }, (_, roundIndex) =>
    2 ** (roundCount - roundIndex - 1),
  )
}
