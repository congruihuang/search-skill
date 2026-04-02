import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LuminaApiClient } from "../api-client.js";
import { LuminaOpenInputSchema } from "../schemas.js";

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerOpenTool(
  server: McpServer,
  client: LuminaApiClient
): void {
  server.registerTool(
    "lumina_open",
    {
      title: "Lumina Open Page",
      description:
        "Open a web page to retrieve its full content. Provide either page_context (from a prior lumina_search or lumina_open result) or a direct url. Use line_no/num_lines for pagination on long pages. Pass the returned toolState to subsequent calls.",
      inputSchema: LuminaOpenInputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      if (!args.page_context && !args.url) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  "Either page_context or url must be provided. Use page_context from a prior search/open result, or provide a direct url.",
              }),
            },
          ],
          isError: true,
        };
      }

      const result = await client.open({
        pageContext: args.page_context,
        id: args.id,
        url: args.url,
        lineNo: args.line_no,
        numLines: args.num_lines,
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
