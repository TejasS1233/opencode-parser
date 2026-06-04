import type { ParseOptions, ParseResult } from "./types.ts"
import { detectType } from "./utils/detect.ts"
import { parsePdf } from "./parsers/pdf.ts"
import { parseDocx } from "./parsers/docx.ts"
import { parseXlsx } from "./parsers/xlsx.ts"
import { parsePptx } from "./parsers/pptx.ts"
import { parseImage } from "./parsers/image.ts"
import { parseEpub, parseMobi } from "./parsers/ebook.ts"
import { parseHtml, parseXml, parseMarkdown } from "./parsers/html.ts"
import { parseIpynb } from "./parsers/ipynb.ts"
import { parseZip, parseRar, parse7z, parseTar, parseGzip } from "./parsers/archive.ts"

export async function parseFile(options: ParseOptions): Promise<ParseResult> {
  const { filePath, maxChars } = options

  let fileBuffer: Uint8Array
  let fileSize: number
  let fileName: string

  try {
    const file = Bun.file(filePath)
    fileSize = file.size
    fileName = filePath.split(/[/\\]/).pop() || filePath
    fileBuffer = await file.arrayBuffer().then((ab) => new Uint8Array(ab))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      type: "error",
      fileName: filePath.split(/[/\\]/).pop() || filePath,
      fileSize: 0,
      meta: {},
      content: {
        text: `Failed to read file: ${msg}`,
        truncated: false,
        totalChars: 0,
        returnedChars: 0,
      },
    }
  }

  if (fileBuffer.length === 0) {
    return {
      type: "empty",
      fileName,
      fileSize: 0,
      meta: {},
      content: {
        text: "File is empty.",
        truncated: false,
        totalChars: 0,
        returnedChars: 0,
      },
    }
  }

  const detected = await detectType(fileBuffer, filePath)
  const mergedOptions = { ...options, maxChars: maxChars ?? 50000 }

  try {
    switch (detected.type) {
      case "pdf":
        return await parsePdf(fileBuffer, fileName, fileSize, mergedOptions)
      case "docx":
        return await parseDocx(fileBuffer, fileName, fileSize, mergedOptions)
      case "xlsx":
      case "csv":
      case "tsv":
      case "xls":
        return await parseXlsx(fileBuffer, fileName, fileSize, mergedOptions)
      case "pptx":
      case "ppt":
        return await parsePptx(fileBuffer, fileName, fileSize, mergedOptions)
      case "png":
      case "jpeg":
      case "webp":
      case "gif":
      case "bmp":
      case "tiff":
        return await parseImage(fileBuffer, fileName, fileSize, mergedOptions)
      case "epub":
        return await parseEpub(fileBuffer, fileName, fileSize, mergedOptions)
      case "mobi":
        return await parseMobi(fileBuffer, fileName, fileSize, mergedOptions)
      case "html":
      case "htm":
        return await parseHtml(fileBuffer, fileName, fileSize, mergedOptions)
      case "xml":
        return await parseXml(fileBuffer, fileName, fileSize, mergedOptions)
      case "markdown":
      case "md":
        return await parseMarkdown(fileBuffer, fileName, fileSize, mergedOptions)
      case "ipynb":
        return await parseIpynb(fileBuffer, fileName, fileSize, mergedOptions)
      case "zip":
        return await parseZip(fileBuffer, fileName, fileSize, mergedOptions)
      case "rar":
        return await parseRar(fileBuffer, fileName, fileSize, mergedOptions)
      case "7z":
        return await parse7z(fileBuffer, fileName, fileSize, mergedOptions)
      case "tar":
        return await parseTar(fileBuffer, fileName, fileSize, mergedOptions)
      case "gz":
        return await parseGzip(fileBuffer, fileName, fileSize, mergedOptions)
      case "text":
      case "json":
      case "yaml":
      case "toml":
      case "ini": {
        const text = new TextDecoder().decode(fileBuffer)
        const limit = maxChars && maxChars > 0 ? maxChars : text.length
        const wordCount = text.replace(/[\x00-\x1F]/g, " ").trim().split(/\s+/).filter(Boolean).length
        return {
          type: detected.type,
          fileName,
          fileSize,
          meta: { format: detected.type.toUpperCase(), wordCount },
          content: {
            text: text.slice(0, limit),
            truncated: text.length > limit,
            totalChars: text.length,
            returnedChars: Math.min(text.length, limit),
          },
        }
      }
      default: {
        return {
          type: "unknown",
          fileName,
          fileSize,
          meta: { format: detected.type === "unknown" ? undefined : detected.type.toUpperCase() },
          content: {
            text: `Unrecognized file type: ${detected.type} (extension: ${detected.ext}).\nFile size: ${fileSize} bytes.\nThe parser supports: PDF, DOCX, XLSX, CSV, PPTX, images (OCR), EPUB, HTML, XML, Markdown, Jupyter Notebooks, ZIP, RAR, 7z, TAR, GZip, JSON, YAML, TOML, INI, and plain text.`,
            truncated: false,
            totalChars: 0,
            returnedChars: 0,
          },
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      type: "error",
      fileName,
      fileSize,
      meta: {},
      content: {
        text: `Error parsing ${detected.type} file: ${msg}`,
        truncated: false,
        totalChars: 0,
        returnedChars: 0,
      },
    }
  }
}
