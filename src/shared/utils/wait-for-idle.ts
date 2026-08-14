type IdleGlobal = typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
}

export function waitForIdle(timeout = 250): Promise<void> {
  return new Promise((resolve) => {
    const requestIdle = (globalThis as IdleGlobal).requestIdleCallback
    if (requestIdle) {
      requestIdle(resolve, { timeout })
      return
    }
    setTimeout(resolve, 0)
  })
}
