# opencode-parser

An [opencode](https://opencode.ai) plugin that parses any file into structured text the LLM can work with.

https://github.com/user-attachments/assets/ed9d6ee7-d30b-43d5-83e0-4e09dafaa422

## Install

```json
{
  "plugin": ["opencode-parser"]
}
```

Or install via CLI: `opencode plugin opencode-parser -g`

Or copy `src/` into `.opencode/tools/` for a local zero-config setup.

## Supported formats

| Format | Extensions | Extracted |
|--------|-----------|-----------|
| PDF | `.pdf` | Text, metadata, pages |
| Word | `.docx` | Text, tables, metadata |
| Excel | `.xlsx`, `.xls`, `.csv`, `.tsv` | Text, tables, sheet names |
| PowerPoint | `.pptx`, `.ppt` | Slide text, speaker notes |
| Images | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.tiff` | OCR text (opt-in) |
| EPUB | `.epub` | Full text with heading structure |
| HTML | `.html`, `.htm` | Body text, headings |
| XML | `.xml` | Stripped text content |
| Markdown | `.md` | Raw text |
| Jupyter | `.ipynb` | Code, markdown, outputs |
| ZIP | `.zip` | File listing with sizes |
| Archives | `.rar`, `.7z`, `.tar`, `.gz` | Listing (extraction notes) |
| Plain text | `.txt`, `.json`, `.yaml`, `.toml`, `.ini` | Raw content |

## Usage

```
Parse @report.pdf and give me a summary
```

```
parse the spreadsheet at @data.xlsx but only the first 3 sheets
```

```
parse @report.pdf and save the full output
```


### Options

| Option | Default | Description |
|--------|---------|-------------|
| `filePath` | — | Path to the file (required) |
| `maxChars` | 50000 | Limit output chars (`-1` for unlimited). Pass `-1` to get the full document. |
| `extractTables` | true | Extract tables from docs/spreadsheets |
| `extractImages` | false | Enable OCR for images |
| `maxPages` | varies | Limit pages/slides/sheets processed |
| `save` | false | Save the full parsed output as a `.md` file alongside the original (no truncation) |
| `outputPath` | — | Custom path for the Markdown export (overrides `save` path) |

## How it works

1. File is verified by **magic bytes**, not just extension
2. Type detection dispatches to the right parser
3. Metadata is extracted (author, pages, sheet count, etc.)
4. Tables become readable markdown
5. Large content is **truncated gracefully** with a note to the LLM

All 15+ format handlers return the same output structure, so the LLM gets consistent results regardless of file type.

## Development

```
npm install
npm run typecheck
```

## License

MIT
