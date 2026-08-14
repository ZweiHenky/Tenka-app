export type FollowIdentity = {
  divisionId: string
}

export function nonemptyId(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

type SyncInput = {
  currentId: string | null
  pushSubscriptionId: string | null
  userIdentity: string | null
  follows: FollowIdentity[]
  sync: (data: { divisionIds: string[]; oneSignalId: string; pushSubscriptionId: string }) => Promise<unknown>
}

export function createNotificationIdentitySynchronizer() {
  let lastSuccessfulSignature: string | null = null
  let tail: Promise<unknown> = Promise.resolve()
  const pending = new Map<string, Promise<string | null>>()

  return function syncNotificationIdentity(input: SyncInput): Promise<string | null> {
    const currentId = nonemptyId(input.currentId)
    const pushSubscriptionId = nonemptyId(input.pushSubscriptionId)
    if (!currentId || !pushSubscriptionId) return Promise.resolve(null)

    const divisionIds = [...new Set(input.follows.map((follow) => follow.divisionId.trim()).filter(Boolean))].sort()
    const signature = JSON.stringify([input.userIdentity ?? null, currentId, pushSubscriptionId, divisionIds])
    if (signature === lastSuccessfulSignature) return Promise.resolve(currentId)

    const existing = pending.get(signature)
    if (existing) return existing

    const operation = tail.catch(() => undefined).then(async () => {
      if (signature === lastSuccessfulSignature) return currentId
      await input.sync({ divisionIds, oneSignalId: currentId, pushSubscriptionId })
      lastSuccessfulSignature = signature
      return currentId
    })
    pending.set(signature, operation)
    tail = operation.then(
      (value) => {
        pending.delete(signature)
        return value
      },
      () => {
        pending.delete(signature)
      },
    )
    return operation
  }
}

export const syncNotificationIdentity = createNotificationIdentitySynchronizer()
