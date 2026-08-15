export interface ReconciledCommit<T> {
  status: "committed"
  data: T
}

export interface ReconciledPending {
  status: "not-committed"
}

export type ReconciliationResult<T> = ReconciledCommit<T> | ReconciledPending

export const committed = <T>(data: T): ReconciledCommit<T> => ({ status: "committed", data })
export const notCommitted = (): ReconciledPending => ({ status: "not-committed" })

export function isAmbiguousNetworkError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string; response?: unknown; request?: unknown }
  if (candidate?.response || candidate?.code === "ERR_CANCELED") return false
  return candidate?.code === "ERR_NETWORK" || candidate?.message === "Network Error" || !!candidate?.request
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function withAmbiguousWriteRecovery<T>(
  write: () => Promise<T>,
  reconcile: () => Promise<ReconciliationResult<T>>,
  attempts = 3,
): Promise<T> {
  try {
    return await write()
  } catch (error) {
    if (!isAmbiguousNetworkError(error)) throw error
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const result = await reconcile()
        if (result.status === "committed") return result.data
      } catch (reconciliationError) {
        if (!isAmbiguousNetworkError(reconciliationError)) throw reconciliationError
      }
      if (attempt + 1 < attempts) await wait(300 * (attempt + 1))
    }
    throw error
  }
}
