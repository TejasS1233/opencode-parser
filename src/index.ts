import type { Plugin } from "@opencode-ai/plugin"
import { parseTool } from "./tool.ts"

export const plugin: Plugin = async () => {
  return {
    tool: {
      parse: parseTool,
    },
  }
}

export default plugin
