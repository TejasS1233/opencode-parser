import { tool } from "@opencode-ai/plugin"
import { parseFile } from "./orchestrator.ts"

export const parseTool = tool({
  description: "Parse and extract text/content from any file type. Supports PDF, DOCX, XLSX, CSV, PPTX, images (OCR), EPUB, HTML, XML, Markdown, Jupyter Notebooks (.ipynb), ZIP, RAR, 7z, TAR, GZip, and plain text files. Returns structured output with metadata, extracted text, tables, and optional OCR.",
  args: {
    filePath: tool.schema.string().describe("Absolute or relative path to the file to parse"),
    maxChars: tool.schema.number().optional().describe("Maximum characters to return (default: 50000). Use -1 for no limit."),
    extractTables: tool.schema.boolean().optional().describe("Extract tables from documents/spreadsheets (default: true)"),
    extractImages: tool.schema.boolean().optional().describe("Extract text from images via OCR (default: false). Requires tesseract.js language data."),
    maxPages: tool.schema.number().optional().describe("Maximum pages/slides/sheets/cells to process (default: no limit or per-format default)"),
    save: tool.schema.boolean().optional().describe("Save the full parsed output as a Markdown file alongside the original (bypasses maxChars truncation)"),
    outputPath: tool.schema.string().optional().describe("Custom path to save the Markdown export (overrides save path)"),
  },
  async execute(args, context) {
    const filePath = args.filePath
    const cwd = context.directory || process.cwd()
    const resolvedPath = filePath.startsWith("/") || filePath.match(/^[A-Za-z]:\\/)
      ? filePath
      : `${cwd}/${filePath.replace(/\\/g, "/")}`

    const maxChars = args.maxChars != null && args.maxChars < 0 ? undefined : (args.maxChars ?? 50000)

    const result = await parseFile({
      filePath: resolvedPath,
      maxChars,
      extractTables: args.extractTables ?? true,
      extractImages: args.extractImages ?? false,
      maxPages: args.maxPages,
    })

    const output = formatResult(result)

    const shouldSave = args.save || !!args.outputPath
    if (shouldSave) {
      const baseName = result.fileName.replace(/\.[^.]+$/, "") + ".md"
      const resolvedOutput = args.outputPath
        ? (args.outputPath.startsWith("/") || args.outputPath.match(/^[A-Za-z]:\\/)
          ? args.outputPath
          : `${cwd}/${args.outputPath.replace(/\\/g, "/")}`)
        : `${cwd}/${baseName}`

      const fullResult = await parseFile({
        filePath: resolvedPath,
        maxChars: undefined,
        extractTables: args.extractTables ?? true,
        extractImages: args.extractImages ?? false,
        maxPages: args.maxPages,
      })
      const fullOutput = formatResult(fullResult)

      const dir = resolvedOutput.substring(0, resolvedOutput.lastIndexOf("/"))
      if (dir) {
        const { mkdirSync } = await import("fs")
        mkdirSync(dir, { recursive: true })
      }
      Bun.write(resolvedOutput, fullOutput)
    }

    return output
  },
})

function formatResult(result: any): string {
  const lines: string[] = []

  const typeLabel = result.type.toUpperCase()
  const sizeLabel = formatSize(result.fileSize)
  lines.push(`## ${result.fileName} (${typeLabel}, ${sizeLabel})`)
  lines.push("")

  const metaEntries = Object.entries(result.meta).filter(([_, v]) => v != null && v !== "")
  if (metaEntries.length > 0) {
    for (const [key, val] of metaEntries) {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
      lines.push(`- **${label}**: ${val}`)
    }
    lines.push("")
  }

  const wordCount = result.meta?.wordCount ?? countWords(result.content?.text || "")
  const charCount = result.content?.text?.length || 0
  lines.push(`- Words: ${wordCount} | Chars: ${charCount.toLocaleString()}${result.meta?.pages ? ` | Pages: ${result.meta.pages}` : ""}`)
  lines.push("")

  if (result.content.truncated) {
    lines.push(`> **Note:** Content was truncated (${result.content.returnedChars.toLocaleString()} of ${result.content.totalChars.toLocaleString()} chars returned). Use maxChars for a higher limit.`)
    lines.push("")
  }

  if (result.tables && result.tables.length > 0) {
    lines.push(`### Tables (${result.tables.length})`)
    lines.push("")
    for (let i = 0; i < Math.min(result.tables.length, 5); i++) {
      const t = result.tables[i]
      if (t.name) lines.push(`**${t.name}:**`)
      if (t.headers.length > 0) lines.push(`| ${t.headers.join(" | ")} |`)
      if (t.headers.length > 0) lines.push(`| ${t.headers.map(() => "---").join(" | ")} |`)
      for (const row of t.rows.slice(0, 20)) {
        lines.push(`| ${row.join(" | ")} |`)
      }
      if (t.rows.length > 20) lines.push(`| _... ${t.rows.length - 20} more rows_ |`)
      lines.push("")
    }
    if (result.tables.length > 5) {
      lines.push(`_... ${result.tables.length - 5} more tables available_`)
      lines.push("")
    }
  }

  if (result.archiveContents && result.archiveContents.length > 0) {
    lines.push(`### Archive Contents (${result.archiveContents.length} entries)`)
    lines.push("")
    for (const entry of result.archiveContents.slice(0, 50)) {
      lines.push(`- ${entry}`)
    }
    if (result.archiveContents.length > 50) {
      lines.push(`- _... ${result.archiveContents.length - 50} more entries_`)
    }
    lines.push("")
  }

  if (result.content.text) {
    lines.push("### Content")
    lines.push("")
    lines.push(result.content.text)
  }

  return lines.join("\n")
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function countWords(text: string): number {
  const cleaned = text.replace(/[\x00-\x1F]/g, " ").trim()
  if (!cleaned) return 0
  return cleaned.split(/\s+/).length
}
