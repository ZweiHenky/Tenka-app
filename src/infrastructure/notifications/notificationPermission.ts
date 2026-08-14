export async function ensureNotificationPermission(input: {
  getPermission: () => Promise<boolean>
  requestPermission: () => Promise<boolean>
}): Promise<boolean> {
  if (await input.getPermission()) return true
  return input.requestPermission()
}
