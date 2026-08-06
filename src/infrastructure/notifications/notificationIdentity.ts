export type FollowIdentity = {
  divisionId: string
}

export function nonemptyId(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export async function syncNotificationIdentity(input: {
  currentId: string | null
  pushSubscriptionId: string | null
  follows: FollowIdentity[]
  subscribe: (data: { divisionId: string; oneSignalId: string; pushSubscriptionId: string }) => Promise<unknown>
}): Promise<string | null> {
  const currentId = nonemptyId(input.currentId)
  const pushSubscriptionId = nonemptyId(input.pushSubscriptionId)
  if (!currentId || !pushSubscriptionId) return null

  for (const follow of input.follows) {
    await input.subscribe({ divisionId: follow.divisionId, oneSignalId: currentId, pushSubscriptionId })
  }
  return currentId
}
