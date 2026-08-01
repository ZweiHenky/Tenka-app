import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import { Platform } from "react-native"

export async function downloadPdf(html: string, filename: string) {
  const { uri } = await Print.printToFileAsync({ html, base64: false })
  if (Platform.OS === "web") {
    window.open(uri, "_blank")
    return
  }
  const available = await Sharing.isAvailableAsync()
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: filename,
      UTI: "com.adobe.pdf",
    })
  }
}

export function standingsHtml(
  divisionNombre: string,
  rows: { pos: number; equipo: string; pj: number; g: number; e: number; p: number; dg: number; pts: number }[],
): string {
  const title = `Tabla de Posiciones - ${divisionNombre}`
  const date = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
  const tableRows = rows
    .map(
      (r) => `
    <tr>
      <td class="pos">${r.pos}</td>
      <td class="eq">${r.equipo}</td>
      <td>${r.pj}</td>
      <td>${r.g}</td>
      <td>${r.e}</td>
      <td>${r.p}</td>
      <td class="${r.dg < 0 ? "neg" : ""}">${r.dg > 0 ? `+${r.dg}` : r.dg}</td>
      <td class="pts">${r.pts}</td>
    </tr>`,
    )
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #222; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .date { font-size: 12px; color: #888; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #2C4673; color: #fff; padding: 8px 6px; text-align: center; }
  th.eq { text-align: left; }
  td { padding: 6px; text-align: center; border-bottom: 1px solid #eee; }
  td.eq { text-align: left; }
  td.pos { font-weight: 700; color: #2C4673; }
  td.pts { font-weight: 700; color: #2C4673; }
  .neg { color: #C62828; }
  tr:nth-child(even) { background: #f5f5f5; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="date">${date}</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th class="eq">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>PTS</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`
}
