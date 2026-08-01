const UNDATED_KEY = "sin-fecha"

export interface ScheduleDateGroup<T> {
  key: string
  label: string
  items: T[]
}

export interface SchedulePdfCell {
  value: unknown
  className?: string
}

export interface SchedulePdfGroup {
  label: string
  rows: SchedulePdfCell[][]
}

interface SchedulePdfOptions {
  kicker: string
  title: string
  metadata?: string[]
  columns: { label: string; width: string }[]
  groups: SchedulePdfGroup[]
}

export function parseScheduleDate(value: string | null): Date | null {
  if (!value) return null
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export function groupScheduleByLocalDate<T>(items: T[], getDate: (item: T) => string | null): ScheduleDateGroup<T>[] {
  const groups = new Map<string, { date: Date | null; items: T[] }>()

  for (const item of items) {
    const date = parseScheduleDate(getDate(item))
    const key = date ? localDateKey(date) : UNDATED_KEY
    const group = groups.get(key) ?? { date, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === UNDATED_KEY) return 1
      if (b === UNDATED_KEY) return -1
      return a.localeCompare(b)
    })
    .map(([key, group]) => ({
      key,
      label: group.date ? dateLabel(group.date) : "Fecha por definir",
      items: [...group.items].sort((a, b) => {
        const aTime = parseScheduleDate(getDate(a))?.getTime() ?? Number.MAX_SAFE_INTEGER
        const bTime = parseScheduleDate(getDate(b))?.getTime() ?? Number.MAX_SAFE_INTEGER
        return aTime - bTime
      }),
    }))
}

export function escapeScheduleHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function scheduleMatchHour(fecha: string | null): string {
  const date = parseScheduleDate(fecha)
  if (!date || /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "")) return "Por definir"
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function sanitizePdfFilenamePart(value: string, fallback: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback
}

export function renderSchedulePdf({ kicker, title, metadata = [], columns, groups }: SchedulePdfOptions): string {
  const colgroup = columns.map((column) => `<col style="width:${column.width}" />`).join("")
  const headers = columns.map((column) => `<th>${escapeScheduleHtml(column.label)}</th>`).join("")
  const details = metadata.length
    ? `<div class="metadata">${metadata.map(escapeScheduleHtml).join(" <span>•</span> ")}</div>`
    : ""
  const dateSections = groups.map((group) => {
    const rows = group.rows.map((row) => `
          <tr>${row.map((cell) => `<td${cell.className ? ` class="${escapeScheduleHtml(cell.className)}"` : ""}>${escapeScheduleHtml(cell.value)}</td>`).join("")}</tr>`).join("")
    return `
      <section class="date-group">
        <h3>${escapeScheduleHtml(group.label)}</h3>
        <table>
          <colgroup>${colgroup}</colgroup>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`
  }).join("")

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    @page { margin: 24px; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #11151d; font-family: Helvetica, Arial, sans-serif; }
    .document-kicker { color: #2196a8; font-size: 12px; font-weight: 700; letter-spacing: .6px; margin-bottom: 4px; text-transform: uppercase; }
    h1 { font-size: 22px; margin: 0 0 3px; }
    .metadata { color: #667085; font-size: 11px; margin-top: 5px; }
    .metadata span { color: #2196a8; padding: 0 2px; }
    h3 { background: #e7f5f7; border-left: 4px solid #2196a8; break-after: avoid; font-size: 14px; margin: 18px 0 7px; page-break-after: avoid; padding: 7px 9px; text-transform: capitalize; }
    .date-group { margin-bottom: 18px; }
    table { border-collapse: collapse; font-size: 9px; table-layout: fixed; width: 100%; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th { background: #202736; color: #fff; padding: 7px 5px; text-align: left; }
    td { border-bottom: 1px solid #dce1e8; padding: 7px 5px; vertical-align: top; overflow-wrap: anywhere; }
    .team { font-weight: 700; }
  </style>
</head>
<body>
  <div class="document-kicker">${escapeScheduleHtml(kicker)}</div>
  <h1>${escapeScheduleHtml(title)}</h1>
  ${details}
  ${dateSections}
</body>
</html>`
}
