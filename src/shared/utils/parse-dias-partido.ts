const BASE_DAY_MAP: Record<string, number> = {
  dom: 0, domingo: 0, domingos: 0,
  lun: 1, lunes: 1,
  mar: 2, martes: 2,
  mie: 3, miercoles: 3, mircoles: 3,
  jue: 4, jueves: 4,
  vie: 5, viernes: 5,
  sab: 6, sabado: 6, sabados: 6, sbado: 6, sbados: 6,
}

const SHORT = { d: 0, l: 1, m: 2, j: 4, v: 5, s: 6 }
const SHORT2: Record<string, number> = { lu: 1, ma: 2, mi: 3, ju: 4, vi: 5, sa: 6, do: 0 }

const ACCENT_MAP: Record<string, string> = {
  "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n",
}

function removeAccents(s: string): string {
  let result = ""
  for (const ch of s) {
    result += ACCENT_MAP[ch] ?? ch
  }
  return result
}

function findDay(raw: string): number | undefined {
  if (!raw) return undefined

  // Try direct match (already without accents)
  if (BASE_DAY_MAP[raw] !== undefined) return BASE_DAY_MAP[raw]
  if (raw.length === 1 && SHORT[raw as keyof typeof SHORT] !== undefined) return SHORT[raw as keyof typeof SHORT]
  if (SHORT2[raw] !== undefined) return SHORT2[raw]

  // Try without accents
  const noAccent = removeAccents(raw)
  if (BASE_DAY_MAP[noAccent] !== undefined) return BASE_DAY_MAP[noAccent]

  // Try stripping all non a-z (handles corrupted chars like U+FFFD)
  const stripped = raw.replace(/[^a-z]/g, "")
  if (BASE_DAY_MAP[stripped] !== undefined) return BASE_DAY_MAP[stripped]
  if (stripped.length <= 2 && SHORT2[stripped] !== undefined) return SHORT2[stripped]

  // Try extracting first 3 alpha chars as prefix
  const prefix = stripped.substring(0, 3)
  if (BASE_DAY_MAP[prefix] !== undefined) return BASE_DAY_MAP[prefix]

  // Last resort: fuzzy match by substring
  for (const [key, val] of Object.entries(BASE_DAY_MAP)) {
    if (stripped.includes(key) || key.includes(stripped)) return val
  }

  return undefined
}

export function parseDiasPartido(text: string): number[] {
  const seen = new Set<number>()
  const result: number[] = []

  const normalized = text
    .toLowerCase()
    .replace(/\s+y\s+/gi, ",")
    .replace(/\s*[/]\s*/g, ",")

  const parts = normalized.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)

  const addDay = (d: number) => {
    if (!seen.has(d)) { seen.add(d); result.push(d) }
  }

  for (const part of parts) {
    const rangeMatch = part.match(/^(.+?)\s+(?:a|al)\s+(.+)$/) ?? part.match(/^(.+?)\s*(?:-|–|—)\s*(.+)$/)
    if (rangeMatch) {
      const from = findDay(rangeMatch[1].trim())
      const to = findDay(rangeMatch[2].trim())
      if (from !== undefined && to !== undefined) {
        if (from <= to) {
          for (let i = from; i <= to; i++) addDay(i)
        } else {
          for (let i = from; i <= 6; i++) addDay(i)
          for (let i = 0; i <= to; i++) addDay(i)
        }
      }
      continue
    }

    const d = findDay(part)
    if (d !== undefined) addDay(d)
  }

  return result
}
