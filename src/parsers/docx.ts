import type { ParseOptions, ParseResult, FileMeta, TableData } from "../types.ts"
import { createResult, cleanText } from "../utils/normalize.ts"

export async function parseDocx(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const mammoth = await import("mammoth")

  const result = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  })

  const convertResult = options.extractTables !== false
    ? await mammoth.convertToHtml({ buffer: Buffer.from(buffer) })
    : null

  const tables: TableData[] = []
  if (convertResult?.value) {
    const cheerio = await import("cheerio")
    const $ = cheerio.load(convertResult.value)
    $("table").each((_i, el) => {
      const headers: string[] = []
      const rows: string[][] = []
      $(el).find("tr").each((_ri, row) => {
        const cells: string[] = []
        $(row).find("th, td").each((_ci, cell) => {
          cells.push($(cell).text().trim())
        })
        if (cells.length > 0) {
          if (headers.length === 0 && $(row).find("th").length > 0) {
            headers.push(...cells)
          } else {
            rows.push(cells)
          }
        }
      })
      if (headers.length > 0 || rows.length > 0) {
        tables.push({ headers, rows })
      }
    })
  }

  const meta: FileMeta = {
    format: "DOCX",
    pages: result.messages.length > 0 ? undefined : undefined,
  }

  const text = cleanText(result.value)

  return createResult("docx", fileName, fileSize, meta, text, {
    tables: tables.length > 0 ? tables : undefined,
    maxChars: options.maxChars,
  })
}
