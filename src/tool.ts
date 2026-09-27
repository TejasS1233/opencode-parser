import type { ToolDomain } from "@opencode/plugin/promise/tool"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { parseFile } from "./orchestrator.ts"
import type { ParseResult } from "./types.ts"

type ParseArgs = {
  filePath: string
  maxChars?: number
  extractTables?: boolean
  extractImages?: boolean
  ocrLang?: string
  maxPages?: number
  save?: boolean
  outputPath?: string
}

export async function registerParseTool(tools: ToolDomain, directory: string): Promise<void> {
  await tools.transform((editor) => {
    editor.add({
      name: "parse",
      description: "Parse and extract text/content from any file type. Supports PDF, DOCX, XLSX, CSV, PPTX, images (OCR), EPUB, HTML, XML, Markdown, Jupyter Notebooks (.ipynb), ZIP, RAR, 7z, TAR, GZip, and plain text files. Returns structured output with metadata, extracted text, tables, and optional OCR.",
      input: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Absolute or relative path to the file to parse" },
          maxChars: { type: "number", description: "Maximum characters to return (default: 50000). Use -1 for no limit." },
          extractTables: { type: "boolean", description: "Extract tables from documents/spreadsheets (default: true)" },
          extractImages: { type: "boolean", description: "Extract text from images via OCR (default: false). Requires tesseract.js language data." },
          ocrLang: { type: "string", description: "OCR language (default: eng). See tesseract.js supported languages." },
          maxPages: { type: "number", description: "Maximum pages/slides/sheets/cells to process" },
          save: { type: "boolean", description: "Save the full parsed output as a Markdown file alongside the original" },
          outputPath: { type: "string", description: "Custom path for the Markdown export" },
        },
        required: ["filePath"],
        additionalProperties: false,
      },
      async execute(input) {
        const args = input as ParseArgs
        const filePath = resolvePath(args.filePath, directory)
        const parseOptions = {
          filePath,
          maxChars: args.maxChars != null && args.maxChars < 0 ? Number.MAX_SAFE_INTEGER : (args.maxChars ?? 50000),
          extractTables: args.extractTables ?? true,
          extractImages: args.extractImages ?? false,
          ocrLang: args.ocrLang ?? "eng",
          maxPages: args.maxPages,
        }
        const result = await parseFile(parseOptions)

        if (args.save || args.outputPath) {
          const baseName = result.fileName.replace(/\.[^.]+$/, "") + ".md"
          const outputPath = args.outputPath ? resolvePath(args.outputPath, directory) : path.join(path.dirname(filePath), baseName)
          const fullResult = await parseFile({ ...parseOptions, maxChars: Number.MAX_SAFE_INTEGER })
          await mkdir(path.dirname(outputPath), { recursive: true })
          await Bun.write(outputPath, formatResult(fullResult))
        }

        return { content: formatResult(result) }
      },
    })
  })
}

function resolvePath(value: string, directory: string): string {
  return path.isAbsolute(value) ? value : path.resolve(directory, value)
}

function formatResult(result: ParseResult): string {
  const lines: string[] = []
  lines.push(`## ${result.fileName} (${result.type.toUpperCase()}, ${formatSize(result.fileSize)})`, "")

  const metaEntries = Object.entries(result.meta).filter(([, value]) => value != null && value !== "")
  for (const [key, value] of metaEntries) {
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())
    lines.push(`- **${label}**: ${value}`)
  }
  if (metaEntries.length) lines.push("")

  const wordCount = result.meta.wordCount ?? countWords(result.content.text)
  lines.push(`- Words: ${wordCount} | Chars: ${result.content.text.length.toLocaleString()}`, "")

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function countWords(text: string): number {
  const cleaned = text.replace(/[\x00-\x1F]/g, " ").trim()
  return cleaned ? cleaned.split(/\s+/).length : 0
}
