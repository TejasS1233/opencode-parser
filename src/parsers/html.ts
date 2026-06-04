import type { ParseOptions, ParseResult, FileMeta, StructureNode } from "../types.ts"
import { createResult, cleanText } from "../utils/normalize.ts"

export async function parseHtml(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const html = new TextDecoder().decode(buffer)
  const cheerio = await import("cheerio")
  const $ = cheerio.load(html)

  const title = $("title").first().text().trim() || undefined

  const meta: FileMeta = {
    title,
    format: "HTML",
  }

  const structure: StructureNode[] = []
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = el.tagName.toLowerCase()
    const level = parseInt(tag[1])
    const text = $(el).text().trim()
    if (text) {
      structure.push({ level, heading: text })
    }
  })

  const bodyText: string[] = []
  $("p, li, blockquote, td, th, pre, code, dt, dd").each((_, el) => {
    const text = $(el).text().trim()
    if (text) bodyText.push(text)
  })

  let text = bodyText.join("\n\n")
  if (title) text = `# ${title}\n\n${text}`
  text = cleanText(text)

  return createResult("html", fileName, fileSize, meta, text, {
    structure: structure.length > 0 ? structure : undefined,
    maxChars: options.maxChars,
  })
}

export async function parseXml(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const xml = new TextDecoder().decode(buffer)
  const text = cleanText(
    xml
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n")
  )

  return createResult("xml", fileName, fileSize, { format: "XML" }, text, {
    maxChars: options.maxChars,
  })
}

export async function parseMarkdown(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const text = new TextDecoder().decode(buffer)
  return createResult("markdown", fileName, fileSize, { format: "Markdown" }, cleanText(text), {
    maxChars: options.maxChars,
  })
}
