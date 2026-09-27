import { Plugin } from "@opencode/plugin"
import { registerParseTool } from "./tool.ts"

export default Plugin.define({
  id: "opencode-parser",
  async setup(ctx) {
    await registerParseTool(ctx.tool, ctx.location.directory)
  },
})
