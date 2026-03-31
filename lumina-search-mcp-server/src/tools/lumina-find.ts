import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LuminaApiClient } from "../api-client.js";
import { LuminaFindInputSchema } from "../schemas.js";

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerFindTool(
  server: McpServer,
  client: LuminaApiClient
): void {
  server.registerTool(
    "lumina_find",
    {
      title: "Lumina Find in Page",
      description:
        "Find text within an already-opened web page. Supports exact pattern matching and semantic search. Requires page_context from a prior lumina_search or lumina_open result, and tool_state from the most recent call.",
      inputSchema: LuminaFindInputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.find({
        pageContext: args.page_context,
        pattern: args.pattern,
        queryType: args.query_type,
        toolState: args.tool_state,
      });

      if (!result.success) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: result.error }) },
          ],
          isError: true,
        };
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
        ],
      };
    }
  );
}
