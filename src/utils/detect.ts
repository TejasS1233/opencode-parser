const MAGIC_BYTES: Record<string, [number[], number]> = {
  pdf:  [[0x25, 0x50, 0x44, 0x46], 4],
  zip:  [[0x50, 0x4B, 0x03, 0x04], 4],
  rar:  [[0x52, 0x61, 0x72, 0x21], 4],
  gz:   [[0x1F, 0x8B], 2],
  epub: [[0x50, 0x4B, 0x03, 0x04], 4],
  xlsx: [[0x50, 0x4B, 0x03, 0x04], 4],
  docx: [[0x50, 0x4B, 0x03, 0x04], 4],
  pptx: [[0x50, 0x4B, 0x03, 0x04], 4],
  png:  [[0x89, 0x50, 0x4E, 0x47], 4],
  jpeg: [[0xFF, 0xD8, 0xFF], 3],
  webp: [[0x52, 0x49, 0x46, 0x46], 4],
  gif:  [[0x47, 0x49, 0x46, 0x38], 4],
  bmp:  [[0x42, 0x4D], 2],
}

const EXTENSION_MAP: Record<string, string> = {
  pdf:   "pdf",
  docx:  "docx",
  xlsx:  "xlsx",
  xls:   "xls",
  csv:   "csv",
  tsv:   "tsv",
  pptx:  "pptx",
  ppt:   "ppt",
  png:   "png",
  jpg:   "jpeg",
  jpeg:  "jpeg",
  webp:  "webp",
  gif:   "gif",
  bmp:   "bmp",
  tiff:  "tiff",
  epub:  "epub",
  html:  "html",
  htm:   "html",
  xml:   "xml",
  ipynb: "ipynb",
  zip:   "zip",
  rar:   "rar",
  "7z":  "7z",
  tar:   "tar",
  gz:    "gz",
  md:    "markdown",
  txt:   "text",
  json:  "json",
  yaml:  "yaml",
  yml:   "yaml",
  toml:  "toml",
  ini:   "ini",
  cfg:   "ini",
  log:   "text",
}

export interface DetectedType {
  type: string
  ext: string
  confidence: "high" | "medium" | "low"
}

export async function detectType(buffer: Uint8Array, filePath: string): Promise<DetectedType> {
  const ext = filePath.toLowerCase().split(".").pop() || ""
  const mappedExt = EXTENSION_MAP[ext] || ext

  for (const [type, [bytes, len]] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length >= len) {
      const match = bytes.every((b, i) => buffer[i] === b)
      if (match) {
        const magicType = EXTENSION_MAP[type] || type
        if (type === "zip") {
          const specific = detectZipType(buffer, ext)
          if (specific) return { type: specific, ext: specific, confidence: "high" }
          return { type: "zip", ext: "zip", confidence: "high" }
        }
        return { type: magicType, ext: magicType, confidence: "high" }
      }
    }
  }

  if (mappedExt && mappedExt !== "zip") {
    return { type: mappedExt, ext, confidence: "medium" }
  }

  if (isTextBuffer(buffer)) {
    return { type: "text", ext: "txt", confidence: "medium" }
  }

  return { type: "unknown", ext, confidence: "low" }
}

function isTextBlock(buffer: Uint8Array, start: number, len: number): boolean {
  for (let i = start; i < start + len && i < buffer.length; i++) {
    const b = buffer[i]
    if (b === 0 || b === 0xFF) return false
    if (b > 0x7E && b < 0xA0) return false
  }
  return true
}

function isTextBuffer(buffer: Uint8Array): boolean {
  if (buffer.length === 0) return false
  let textChars = 0
  const checkLen = Math.min(buffer.length, 4096)
  for (let i = 0; i < checkLen; i++) {
    const b = buffer[i]
    if (b === 0 || b >= 248) continue
    if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13 || b >= 128) {
      textChars++
    }
  }
  return textChars / checkLen > 0.8
}

function detectZipType(buffer: Uint8Array, ext: string): string | null {
  if (ext === "xlsx" || ext === "docx" || ext === "pptx" || ext === "epub") {
    return EXTENSION_MAP[ext] || ext
  }
  return null
}
