import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { expect, test } from "bun:test"
import { registerParseTool } from "../src/tool-v2.ts"
import { detectType } from "../src/utils/detect.ts"

test("detects a PDF from magic bytes", async () => {
  const result = await detectType(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "document.txt")
  expect(result).toEqual({ type: "pdf", ext: "pdf", confidence: "high" })
})

test("detects text formats from their extension", async () => {
  const result = await detectType(new TextEncoder().encode("name = 'opencode'"), "config.toml")
  expect(result).toEqual({ type: "toml", ext: "toml", confidence: "medium" })
})

test("registers and executes the V2 parse tool", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "opencode-parser-test-"))
  try {
    const inputPath = path.join(directory, "document.md")
    const outputPath = path.join(directory, "exports", "document.md")
    await writeFile(inputPath, "# Title\n\nThis is a test document.")

    let registered: { execute(input: unknown): Promise<{ content: string }> } | undefined
    const tools = {
      transform: async (transform: (editor: { add(tool: typeof registered): void }) => void) => {
        transform({
          add(tool) {
            registered = tool
          },
        })
      },
    }

    await registerParseTool(tools as never, directory)
    expect(registered).toBeDefined()

    const result = await registered!.execute({
      filePath: "document.md",
      maxChars: 10,
      outputPath,
    })

    expect(result.content).toContain("## document.md (MARKDOWN")
    expect(result.content).toContain("Content was truncated")
    expect(result.content).toContain("# Title")
    expect(await readFile(outputPath, "utf8")).toContain("This is a test document.")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("supports unlimited output for returned and saved content", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "opencode-parser-test-"))
  try {
    const inputPath = path.join(directory, "long.md")
    const outputPath = path.join(directory, "long-output.md")
    const marker = "END-OF-LONG-DOCUMENT"
    await writeFile(inputPath, `${"x".repeat(50_100)}${marker}`)

    let registered: { execute(input: unknown): Promise<{ content: string }> } | undefined
    const tools = {
      transform: async (transform: (editor: { add(tool: typeof registered): void }) => void) => {
        transform({ add: (tool) => { registered = tool } })
      },
    }
    await registerParseTool(tools as never, directory)
    const result = await registered!.execute({ filePath: inputPath, maxChars: -1, outputPath })

    expect(result.content).toContain(marker)
    expect(await readFile(outputPath, "utf8")).toContain(marker)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("creates parent directories for saved output", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "opencode-parser-test-"))
  try {
    const inputPath = path.join(directory, "document.md")
    const outputPath = path.join(directory, "nested", "output.md")
    await writeFile(inputPath, "content")

    let registered: { execute(input: unknown): Promise<{ content: string }> } | undefined
    const tools = {
      transform: async (transform: (editor: { add(tool: typeof registered): void }) => void) => {
        transform({ add: (tool) => { registered = tool } })
      },
    }
    await registerParseTool(tools as never, directory)
    await registered!.execute({ filePath: inputPath, outputPath })

    expect(await readFile(outputPath, "utf8")).toContain("content")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
