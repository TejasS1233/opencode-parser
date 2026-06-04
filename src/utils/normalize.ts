import type { ParseResult, FileMeta, TableData, StructureNode, ImageData } from "../types.ts"

export function createResult(
  type: string,
  fileName: string,
  fileSize: number,
  meta: FileMeta,
  text: string,
  options: {
    tables?: TableData[]
    structure?: StructureNode[]
    images?: ImageData[]
    archiveContents?: string[]
    maxChars?: number
  } = {},
): ParseResult {
  const maxChars = options.maxChars ?? 50000
  const totalChars = text.length
  const hasLimit = maxChars > 0
  const truncated = hasLimit && totalChars > maxChars
  const returnedText = truncated
    ? text.slice(0, maxChars) + `\n\n[... truncated at ${maxChars.toLocaleString()} chars. Total available: ${totalChars.toLocaleString()} chars]`
    : text

  return {
    type,
    fileName,
    fileSize,
    meta: { ...meta, wordCount: countWords(returnedText) },
    content: {
      text: returnedText,
      truncated,
      totalChars,
      returnedChars: returnedText.length,
    },
    tables: options.tables,
    structure: options.structure,
    images: options.images,
    archiveContents: options.archiveContents,
  }
}

export function countWords(text: string): number {
  const cleaned = text.replace(/[\x00-\x1F]/g, " ").trim()
  if (!cleaned) return 0
  return cleaned.split(/\s+/).length
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
