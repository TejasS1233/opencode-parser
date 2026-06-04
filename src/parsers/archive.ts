import type { ParseOptions, ParseResult, FileMeta } from "../types.ts"
import { createResult, cleanText, formatFileSize } from "../utils/normalize.ts"

export async function parseZip(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const JSZip = await import("jszip")
  const zip = await JSZip.loadAsync(Buffer.from(buffer))

  const allFiles = Object.keys(zip.files).sort()
  const meta: FileMeta = {
    format: "ZIP",
    entries: allFiles.length,
  }

  const maxEntries = options.maxPages ?? 200
  const entriesToShow = allFiles.slice(0, maxEntries)
  const skipped = allFiles.length - entriesToShow.length

  const lines: string[] = [`Archive: ${fileName} (${formatFileSize(fileSize)})`, `${allFiles.length} entries`, ""]

  for (const name of entriesToShow) {
    const entry = zip.files[name]
    const isDir = name.endsWith("/")
    const size = entry as any
    const entrySize = isDir ? 0 : size._data?.uncompressedSize || 0
    const compressed = isDir ? 0 : size._data?.compressedSize || 0
    const ratio = compressed > 0 ? Math.round((1 - compressed / entrySize) * 100) : 0
    lines.push(`${isDir ? "  " : "  "} ${name}${isDir ? "/" : ""}${!isDir ? ` (${formatFileSize(entrySize)}, ${ratio}% compressed)` : ""}`)
  }

  if (skipped > 0) {
    lines.push(`\n[... ${skipped} more entries. Use maxPages to increase limit.]`)
  }

  return createResult("zip", fileName, fileSize, meta, cleanText(lines.join("\n")), {
    archiveContents: allFiles,
    maxChars: options.maxChars,
  })
}

export async function parseRar(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  return createResult("rar", fileName, fileSize, { format: "RAR" },
    `RAR file: ${fileName} (${formatFileSize(fileSize)}). RAR extraction requires external tool (e.g., unrar/7z).`, {
    maxChars: options.maxChars,
  })
}

export async function parse7z(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  return createResult("7z", fileName, fileSize, { format: "7z" },
    `7z file: ${fileName} (${formatFileSize(fileSize)}). 7z extraction requires external tool (e.g., 7-Zip).`, {
    maxChars: options.maxChars,
  })
}

export async function parseTar(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const entries: string[] = []
  let pos = 0
  const decoder = new TextDecoder()
  const maxEntries = options.maxPages ?? 200

  while (pos + 512 <= buffer.length && entries.length < maxEntries) {
    const header = buffer.slice(pos, pos + 512)
    const nameBytes = header.slice(0, 100)
    const sizeBytes = header.slice(124, 136)

    const nameEnd = nameBytes.indexOf(0)
    const name = nameEnd >= 0 ? decoder.decode(nameBytes.slice(0, nameEnd)) : decoder.decode(nameBytes)

    if (!name) break

    let sizeStr = ""
    for (const b of sizeBytes) {
      if (b === 0) break
      sizeStr += String.fromCharCode(b)
    }
    const fileSize_ = parseInt(sizeStr, 8) || 0
    const roundedBlocks = Math.ceil(fileSize_ / 512)
    entries.push(`  ${name} (${formatFileSize(fileSize_)})`)
    pos += 512 + roundedBlocks * 512
  }

  const meta: FileMeta = { format: "TAR", entries: entries.length }
  const text = `Archive: ${fileName} (${formatFileSize(fileSize)})\n${entries.length} entries\n\n${entries.join("\n")}`
  return createResult("tar", fileName, fileSize, meta, cleanText(text), {
    archiveContents: entries.map((e) => e.replace(/^\s+/, "").split(" (")[0]),
    maxChars: options.maxChars,
  })
}

export async function parseGzip(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const text = `GZip file: ${fileName} (${formatFileSize(fileSize)}). Use external tools to decompress.`
  return createResult("gz", fileName, fileSize, { format: "GZip" }, text, {
    maxChars: options.maxChars,
  })
}
