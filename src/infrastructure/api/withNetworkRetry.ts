export async function withNetworkRetry<T>(request: () => Promise<T>, retries = 1): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await request()
    } catch (error) {
      const isNetworkError = !(error as { response?: unknown })?.response
      if (!isNetworkError || attempt >= retries) throw error
      attempt += 1
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}
