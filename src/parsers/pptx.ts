import type { ParseOptions, ParseResult, FileMeta } from "../types.ts"
import { createResult, cleanText } from "../utils/normalize.ts"

export async function parsePptx(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const JSZip = await import("jszip")
  const zip = await JSZip.loadAsync(Buffer.from(buffer))

  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort()

  const meta: FileMeta = {
    slides: slideFiles.length,
    format: "PPTX",
  }

  const maxSlides = options.maxPages ?? 100
  const slidesToProcess = slideFiles.slice(0, maxSlides)
  const skippedSlides = slideFiles.length - slidesToProcess.length

  const allText: string[] = []

  for (const slideFile of slidesToProcess) {
    const slideNum = slideFile.match(/slide(\d+)\.xml$/)?.[1] || "?"
    const content = await zip.files[slideFile].async("string")
    const text = extractSlideText(content)
    allText.push(`--- Slide ${slideNum} ---`)
    allText.push(text)
    allText.push("")
  }

  const notesFile = slideFiles.map((f) =>
    f.replace("slides", "notesSlide").replace("slide", "notesSlide")
  )
  for (const nf of notesFile) {
    if (zip.files[nf]) {
      const content = await zip.files[nf].async("string")
      const notes = extractSlideText(content)
      if (notes.trim()) {
        const slideNum = nf.match(/notesSlide(\d+)\.xml$/)?.[1] || "?"
        allText.push(`[Speaker Notes - Slide ${slideNum}]: ${notes.trim()}`)
      }
    }
  }

  if (skippedSlides > 0) {
    allText.push(`\n[... ${skippedSlides} more slide(s) not processed. Use maxPages to increase limit.]`)
  }

  const text = cleanText(allText.join("\n"))

  return createResult("pptx", fileName, fileSize, meta, text, {
    maxChars: options.maxChars,
  })
}

function extractSlideText(xml: string): string {
  const texts: string[] = []
  const regex = /<a:t[^>]*>([^<]+)<\/a:t>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    texts.push(match[1])
  }
  return texts.join(" ")
}
