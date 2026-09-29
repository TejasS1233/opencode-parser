import { Plugin } from "@opencode/plugin"
import { parseTool } from "./tool.ts"
import { registerParseTool } from "./tool-v2.ts"

// Dual v1 + v2 entrypoint (https://opencode.ai/v2/docs/build/plugins/migrate-v1):
// - V2 reads `id` + `setup()` and ignores `server()`
// - V1 (>=1.18.29) calls `server()` and ignores `id`/`setup()`
export default {
  ...Plugin.define({
    id: "opencode-parser",
    async setup(ctx) {
      await registerParseTool(ctx.tool, ctx.location.directory)
    },
  }),
  async server() {
    return {
      tool: {
        parse: parseTool,
      },
    }
  },
}
