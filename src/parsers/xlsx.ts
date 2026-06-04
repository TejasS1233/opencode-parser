import type { ParseOptions, ParseResult, FileMeta, TableData } from "../types.ts"
import { createResult, cleanText } from "../utils/normalize.ts"

export async function parseXlsx(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const XLSX = await import("xlsx")

  const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer" })

  const meta: FileMeta = {
    sheets: workbook.SheetNames.length,
    format: fileName.endsWith(".csv") ? "CSV" : "XLSX",
  }

  const maxPages = options.maxPages ?? 20
  const sheetsToProcess = workbook.SheetNames.slice(0, maxPages)
  const skippedSheets = workbook.SheetNames.length - sheetsToProcess.length

  const allText: string[] = []
  const tables: TableData[] = []

  for (const sheetName of sheetsToProcess) {
    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

    allText.push(`=== Sheet: ${sheetName} ===`)

    const sheetTable: TableData = { headers: [], rows: [], name: sheetName }
    let headerRow = true

    for (const row of json) {
      if (!Array.isArray(row)) continue
      const cells = row.map((c) => String(c ?? ""))
      allText.push(cells.join("\t"))

      if (headerRow && cells.length > 0) {
        sheetTable.headers = cells
        headerRow = false
      } else {
        sheetTable.rows.push(cells)
      }
    }
    allText.push("")

    if (sheetTable.headers.length > 0 || sheetTable.rows.length > 0) {
      tables.push(sheetTable)
    }
  }

  if (skippedSheets > 0) {
    allText.push(`\n[... ${skippedSheets} more sheet(s) not processed. Use maxPages to increase limit.]`)
  }

  const text = cleanText(allText.join("\n"))

  return createResult("xlsx", fileName, fileSize, meta, text, {
    tables,
    maxChars: options.maxChars,
  })
}
