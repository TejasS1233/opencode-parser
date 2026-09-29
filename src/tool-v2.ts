import type { ToolDomain } from "@opencode/plugin/promise/tool"
import { runParse, type ParseArgs } from "./shared.ts"

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
        const content = await runParse(args, directory, (filePath, fileContent) => Bun.write(filePath, fileContent))
        return { content }
      },
    })
  })
}
