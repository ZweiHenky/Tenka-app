import { isAmbiguousNetworkError } from "./ambiguous-write"

export async function withNetworkRetry<T>(request: () => Promise<T>, retries = 1): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await request()
    } catch (error) {
      if (!isAmbiguousNetworkError(error) || attempt >= retries) throw error
      attempt += 1
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}
