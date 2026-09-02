export function redactUrlQuery(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  return value.split("?")[0]
}
