#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { LuminaApiClient } from "./api-client.js";
import { registerSearchTool } from "./tools/lumina-search.js";
import { registerOpenTool } from "./tools/lumina-open.js";
import { registerFindTool } from "./tools/lumina-find.js";

async function main() {
  // 1. Load configuration (fails fast with descriptive error if missing)
  const config = loadConfig();
  console.error(
    `[lumina-search-mcp] Loaded config: endpoint=${config.endpoint}`
  );

  // 2. Create shared API client
  const client = new LuminaApiClient(config);

  // 3. Create MCP server
  const server = new McpServer({
    name: "lumina-search",
    version: "1.0.0",
  });

  // 4. Register all tools
  registerSearchTool(server, client);
  registerOpenTool(server, client);
  registerFindTool(server, client);

  // 5. Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[lumina-search-mcp] Server running on stdio");
}

main().catch((error) => {
  console.error("[lumina-search-mcp] Fatal error:", error);
  process.exit(1);
});
