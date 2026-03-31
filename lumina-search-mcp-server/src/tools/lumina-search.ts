import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LuminaApiClient } from "../api-client.js";
import { LuminaSearchInputSchema } from "../schemas.js";

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerSearchTool(
  server: McpServer,
  client: LuminaApiClient
): void {
  server.registerTool(
    "lumina_search",
    {
      title: "Lumina Web Search",
      description:
        "Search the web using Lumina Search (powered by Bing). Returns search result snippets with pageContext references that can be passed to lumina_open or lumina_find for full page content. Pass the returned toolState to subsequent calls.",
      inputSchema: LuminaSearchInputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.search({
        q: args.q,
        topN: args.topN,
        recency: args.recency,
        source: args.source,
        domains: args.domains,
        language: args.language,
        countryCode: args.countryCode,
        market: args.market,
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
