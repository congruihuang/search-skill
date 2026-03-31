import { z } from "zod";

// === Shared Types ===

export const PageContextInfoSchema = z.object({
  pageId: z.string().optional().describe("Unique page identifier"),
  id: z.number().int().optional().describe("Numeric index within the result set"),
  turn: z.number().int().optional().describe("Conversation turn number when created"),
  action: z.enum(["Search", "View"]).optional().describe("Action that produced this page context"),
  loc: z.number().int().optional().describe("Line offset location in content"),
  lines: z.number().int().optional().describe("Number of lines from loc"),
});

export const ToolStateSchema = z
  .object({
    sessionId: z.string().optional(),
    pages: z
      .record(
        z.string(),
        z.object({
          urls: z.array(z.string()).optional(),
          imageUrls: z.array(z.string()).optional(),
        })
      )
      .optional(),
  })
  .passthrough(); // ToolState is opaque — preserve unknown fields

// === Tool Input Schemas (Zod raw shape format for McpServer.registerTool) ===

export const LuminaSearchInputSchema = {
  q: z.string().describe("Search query text"),
  topN: z.number().int().optional().describe("Maximum number of results to return"),
  recency: z
    .number()
    .int()
    .optional()
    .describe("Number of days for recency filtering (0 = no filter)"),
  source: z
    .string()
    .optional()
    .default("web_with_bing")
    .describe("Data source for search"),
  domains: z
    .array(z.string())
    .optional()
    .describe("Restrict search to these domains (e.g., ['microsoft.com'])"),
  language: z
    .string()
    .optional()
    .describe("Two-letter ISO language code (e.g., 'en')"),
  countryCode: z
    .string()
    .optional()
    .describe("Two-letter ISO country code (e.g., 'us')"),
  market: z
    .string()
    .optional()
    .describe("Market locale string (e.g., 'en-US')"),
  tool_state: ToolStateSchema.optional().describe(
    "Opaque ToolState from a prior call. Pass through unchanged."
  ),
};

export const LuminaOpenInputSchema = {
  page_context: PageContextInfoSchema.optional().describe(
    "PageContextInfo from a prior search or open result"
  ),
  url: z
    .string()
    .optional()
    .describe("Direct URL to open (alternative to page_context)"),
  line_no: z
    .number()
    .int()
    .optional()
    .default(0)
    .describe("Start line number for page content"),
  num_lines: z
    .number()
    .int()
    .optional()
    .describe("Number of lines of page content to return"),
  tool_state: ToolStateSchema.describe(
    "ToolState from a prior call (required)"
  ),
};

export const LuminaFindInputSchema = {
  page_context: PageContextInfoSchema.describe(
    "PageContextInfo identifying the page to search within"
  ),
  pattern: z.string().describe("Text pattern to find in the page"),
  query_type: z
    .enum(["pattern", "semantic"])
    .optional()
    .default("pattern")
    .describe("Type of search: 'pattern' for exact match, 'semantic' for meaning-based"),
  tool_state: ToolStateSchema.describe(
    "ToolState from a prior call (required)"
  ),
};
