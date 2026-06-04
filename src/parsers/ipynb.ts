import type { ParseOptions, ParseResult, FileMeta } from "../types.ts"
import { createResult, cleanText } from "../utils/normalize.ts"

export async function parseIpynb(buffer: Uint8Array, fileName: string, fileSize: number, options: ParseOptions): Promise<ParseResult> {
  const text = new TextDecoder().decode(buffer)
  let notebook: any

  try {
    notebook = JSON.parse(text)
  } catch {
    return createResult("ipynb", fileName, fileSize, { format: "IPYNB" }, "Invalid JSON: Could not parse notebook file.", {
      maxChars: options.maxChars,
    })
  }

  const meta: FileMeta = {
    format: "Jupyter Notebook",
  }

  const cells = notebook.cells || []
  const maxCells = options.maxPages ?? 200
  const cellsToProcess = cells.slice(0, maxCells)
  const skipped = cells.length - cellsToProcess.length

  const output: string[] = []

  for (const cell of cellsToProcess) {
    const cellType = cell.cell_type || "unknown"
    const source = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "")

    if (cellType === "markdown") {
      output.push(source.trim())
      output.push("")
    } else if (cellType === "code") {
      output.push("```python")
      output.push(source.trim())
      output.push("```")

      const outputs = cell.outputs || []
      for (const out of outputs) {
        const outText =
          (out.text && (Array.isArray(out.text) ? out.text.join("") : out.text)) ||
          (out.data?.["text/plain"] && (Array.isArray(out.data["text/plain"]) ? out.data["text/plain"].join("") : out.data["text/plain"])) ||
          ""
        if (outText.trim()) {
          output.push("```output")
          output.push(outText.trim())
          output.push("```")
        }
      }
      output.push("")
    }
  }

  if (skipped > 0) {
    output.push(`\n[... ${skipped} more cell(s) not processed. Use maxPages to increase limit.]`)
  }

  const resultText = cleanText(output.join("\n"))

  return createResult("ipynb", fileName, fileSize, meta, resultText, {
    maxChars: options.maxChars,
  })
}
