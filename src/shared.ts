import path from "node:path"
import { parseFile } from "./orchestrator.ts"
import type { ParseResult } from "./types.ts"

export type ParseArgs = {
  filePath: string
  maxChars?: number
  extractTables?: boolean
  extractImages?: boolean
  ocrLang?: string
  maxPages?: number
  save?: boolean
  outputPath?: string
}

/** -1 / negative means unlimited. Matches README + V1 behaviour. */
export const NO_LIMIT = Number.MAX_SAFE_INTEGER

export function resolveParseOptions(args: ParseArgs, filePath: string) {
  return {
    filePath,
    maxChars: args.maxChars != null && args.maxChars < 0 ? NO_LIMIT : (args.maxChars ?? 50000),
    extractTables: args.extractTables ?? true,
    extractImages: args.extractImages ?? false,
    ocrLang: args.ocrLang ?? "eng",
    maxPages: args.maxPages,
  }
}

export function resolvePath(value: string, directory: string): string {
  return path.isAbsolute(value) ? value : path.resolve(directory, value)
}

export function resolveOutputPath(args: ParseArgs, filePath: string, fileName: string, directory: string): string | undefined {
  if (!args.save && !args.outputPath) return undefined
  if (args.outputPath) return resolvePath(args.outputPath, directory)
  const baseName = fileName.replace(/\.[^.]+$/, "") + ".md"
  return path.join(path.dirname(filePath), baseName)
}

export async function runParse(
  args: ParseArgs,
  directory: string,
  writeFile: (filePath: string, content: string) => unknown,
): Promise<string> {
  const filePath = resolvePath(args.filePath, directory)
  const parseOptions = resolveParseOptions(args, filePath)
  const result = await parseFile(parseOptions)

  const outputPath = resolveOutputPath(args, filePath, result.fileName, directory)
  if (outputPath) {
    const fullResult = await parseFile({ ...parseOptions, maxChars: NO_LIMIT })
    const { mkdir } = await import("node:fs/promises")
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, formatResult(fullResult))
  }

  return formatResult(result)
}

export function formatResult(result: ParseResult): string {
  const lines: string[] = []
  lines.push(`## ${result.fileName} (${result.type.toUpperCase()}, ${formatSize(result.fileSize)})`, "")

  const metaEntries = Object.entries(result.meta).filter(([, value]) => value != null && value !== "")
  for (const [key, value] of metaEntries) {
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())
    lines.push(`- **${label}**: ${value}`)
  }
  if (metaEntries.length) lines.push("")

  const wordCount = result.meta.wordCount ?? countWords(result.content.text)
  const pagesSuffix = result.meta?.pages ? ` | Pages: ${result.meta.pages}` : ""
  lines.push(`- Words: ${wordCount} | Chars: ${result.content.text.length.toLocaleString()}${pagesSuffix}`, "")

  if (result.content.truncated) {
    lines.push(`> **Note:** Content was truncated (${result.content.returnedChars.toLocaleString()} of ${result.content.totalChars.toLocaleString()} chars returned). Use maxChars for a higher limit.`, "")
  }

  if (result.tables?.length) {
    lines.push(`### Tables (${result.tables.length})`, "")
    for (const table of result.tables.slice(0, 5)) {
      if (table.name) lines.push(`**${table.name}:**`)
      if (table.headers.length) {
        lines.push(`| ${table.headers.join(" | ")} |`)
        lines.push(`| ${table.headers.map(() => "---").join(" | ")} |`)
      }
      for (const row of table.rows.slice(0, 20)) lines.push(`| ${row.join(" | ")} |`)
      if (table.rows.length > 20) lines.push(`| _... ${table.rows.length - 20} more rows_ |`)
      lines.push("")
    }
    if (result.tables.length > 5) lines.push(`_... ${result.tables.length - 5} more tables available_`, "")
  }

  if (result.archiveContents?.length) {
    lines.push(`### Archive Contents (${result.archiveContents.length} entries)`, "")
    lines.push(...result.archiveContents.slice(0, 50).map((entry) => `- ${entry}`))
    if (result.archiveContents.length > 50) {
      lines.push(`- _... ${result.archiveContents.length - 50} more entries_`)
    }
    lines.push("")
  }

  if (result.content.text) lines.push("### Content", "", result.content.text)
  return lines.join("\n")
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function countWords(text: string): number {
  const cleaned = text.replace(/[\x00-\x1F]/g, " ").trim()
  return cleaned ? cleaned.split(/\s+/).length : 0
}
