export interface ParseOptions {
  filePath: string
  maxChars?: number
  extractTables?: boolean
  extractImages?: boolean
  ocrLang?: string
  maxPages?: number
}

export interface TableData {
  name?: string
  headers: string[]
  rows: string[][]
}

export interface StructureNode {
  level: number
  heading: string
  content?: string
}

export interface ImageData {
  index: number
  page?: number
  text?: string
}

export interface FileMeta {
  title?: string
  author?: string
  created?: string
  modified?: string
  pages?: number
  sheets?: number
  slides?: number
  wordCount?: number
  entries?: number
  format?: string
  encrypted?: boolean
}

export interface ParseResult {
  type: string
  fileName: string
  fileSize: number
  meta: FileMeta
  content: {
    text: string
    truncated: boolean
    totalChars: number
    returnedChars: number
  }
  tables?: TableData[]
  structure?: StructureNode[]
  images?: ImageData[]
  archiveContents?: string[]
}
