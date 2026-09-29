import { tool } from "@opencode-ai/plugin"
import { runParse } from "./shared.ts"

export const parseTool = tool({
  description: "Parse and extract text/content from any file type. Supports PDF, DOCX, XLSX, CSV, PPTX, images (OCR), EPUB, HTML, XML, Markdown, Jupyter Notebooks (.ipynb), ZIP, RAR, 7z, TAR, GZip, and plain text files. Returns structured output with metadata, extracted text, tables, and optional OCR.",
  args: {
    filePath: tool.schema.string().describe("Absolute or relative path to the file to parse"),
    maxChars: tool.schema.number().optional().describe("Maximum characters to return (default: 50000). Use -1 for no limit."),
    extractTables: tool.schema.boolean().optional().describe("Extract tables from documents/spreadsheets (default: true)"),
    extractImages: tool.schema.boolean().optional().describe("Extract text from images via OCR (default: false). Requires tesseract.js language data."),
    ocrLang: tool.schema.string().optional().describe("OCR language (default: eng). See tesseract.js supported languages."),
    maxPages: tool.schema.number().optional().describe("Maximum pages/slides/sheets/cells to process (default: no limit or per-format default)"),
    save: tool.schema.boolean().optional().describe("Save the full parsed output as a Markdown file alongside the original (bypasses maxChars truncation)"),
    outputPath: tool.schema.string().optional().describe("Custom path to save the Markdown export (overrides save path)"),
  },
  async execute(args, context) {
    const directory = context.directory || process.cwd()
    return runParse(args, directory, (filePath, content) => Bun.write(filePath, content))
  },
})
