export function parseDorsal(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d{1,3}$/.test(normalized)) return null

  const dorsal = Number(normalized)
  return dorsal >= 0 && dorsal <= 999 ? dorsal : null
}
