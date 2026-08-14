export async function changeDivisionSubscription(input: {
  subscribed: boolean
  divisionId: string
  oneSignalId: string
  pushSubscriptionId: string
  subscribe: (data: { divisionId: string; oneSignalId: string; pushSubscriptionId: string }) => Promise<unknown>
  unsubscribe: (data: { divisionId: string; oneSignalId: string; pushSubscriptionId: string }) => Promise<unknown>
  commitLocalState: () => void
}): Promise<void> {
  if (input.subscribed) {
    await input.unsubscribe({ divisionId: input.divisionId, oneSignalId: input.oneSignalId, pushSubscriptionId: input.pushSubscriptionId })
  } else {
    await input.subscribe({
      divisionId: input.divisionId,
      oneSignalId: input.oneSignalId,
      pushSubscriptionId: input.pushSubscriptionId,
    })
  }
  input.commitLocalState()
}
