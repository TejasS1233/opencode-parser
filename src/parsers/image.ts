import type { ParseOptions, ParseResult, FileMeta } from "../types.ts"
import { createResult, cleanText } from "../utils/normalize.ts"

export async function parseImage(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const ext = fileName.toLowerCase().split(".").pop() || ""

  const meta: FileMeta = {
    format: ext.toUpperCase(),
  }

  if (options.extractImages !== true) {
    const text = `Image file: ${fileName} (${(fileSize / 1024).toFixed(1)} KB). Enable extractImages: true to perform OCR.`
    return createResult("image", fileName, fileSize, meta, text, {
      maxChars: options.maxChars,
    })
  }

  try {
    const Tesseract = await import("tesseract.js")
    const buf = Buffer.from(buffer)
    const { data } = await Tesseract.recognize(buf, "eng", {
      logger: () => {},
    })

    const text = cleanText(data.text || "[No text detected in image]")

    return createResult("image", fileName, fileSize, meta, text, {
      maxChars: options.maxChars,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const text = `OCR failed for ${fileName}: ${errMsg}. Ensure tesseract.js language data is available.`
    return createResult("image", fileName, fileSize, meta, text, {
      maxChars: options.maxChars,
    })
  }
}
