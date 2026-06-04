import type { ParseOptions, ParseResult, FileMeta, StructureNode } from "../types.ts"
import { createResult, cleanText } from "../utils/normalize.ts"

export async function parseEpub(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const JSZip = await import("jszip")
  const zip = await JSZip.loadAsync(Buffer.from(buffer))

  const htmlFiles = Object.keys(zip.files)
    .filter((name) => name.match(/\.(xhtml|html|htm)$/i))
    .sort()

  const meta: FileMeta = {
    format: "EPUB",
    pages: htmlFiles.length,
  }

  const maxFiles = options.maxPages ?? 50
  const filesToProcess = htmlFiles.slice(0, maxFiles)
  const skipped = htmlFiles.length - filesToProcess.length

  const allText: string[] = []
  const structure: StructureNode[] = []

  const cheerio = await import("cheerio")

  for (const htmlFile of filesToProcess) {
    const content = await zip.files[htmlFile].async("string")
    const $ = cheerio.load(content)

    $("title").each((_, el) => {
      const title = $(el).text().trim()
      if (title) {
        allText.push(`# ${title}`)
        structure.push({ level: 1, heading: title })
      }
    })

    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const tag = el.tagName.toLowerCase()
      const level = parseInt(tag[1])
      const text = $(el).text().trim()
      if (text) {
        allText.push(`${"#".repeat(level)} ${text}`)
        structure.push({ level, heading: text })
      }
    })

    $("p, li, blockquote, td, th").each((_, el) => {
      const text = $(el).text().trim()
      if (text) {
        allText.push(text)
      }
    })
  }

  if (skipped > 0) {
    allText.push(`\n[... ${skipped} more file(s) not processed. Use maxPages to increase limit.]`)
  }

  const text = cleanText(allText.join("\n"))

  return createResult("epub", fileName, fileSize, meta, text, {
    structure: structure.length > 0 ? structure : undefined,
    maxChars: options.maxChars,
  })
}

export async function parseMobi(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const text = `MOBI file: ${fileName}. MOBI parsing is not natively supported. Convert to EPUB for parsing.`
  return createResult("mobi", fileName, fileSize, { format: "MOBI" }, text, {
    maxChars: options.maxChars,
  })
}
