---
name: lumina-web
description: "Lumina Web tools for web search, page retrieval, and in-page text finding. Provides three MCP tools: lumina_search, lumina_open, and lumina_find. TRIGGER when: user asks to search the web, look something up online, research a topic, fetch current/live data (stock prices, news, weather, sports scores), open or read a URL/webpage, find specific content on a web page, or any task requiring information not available locally. Also trigger when building workflows that need grounded web search results. Examples: 'what is the stock price of X', 'look up Y', 'search for Z', 'open this URL', 'find information about...', 'get the latest news on...', 'research topic X'. This skill MUST be invoked BEFORE calling lumina_search, lumina_open, or lumina_find MCP tools directly. DO NOT TRIGGER when: user asks to search local files, grep code, read local files, or do git operations."
---

# Lumina Search Service

Three MCP tools for web search, page content retrieval, and in-page text search. All share a `toolState` session object that flows between calls. Authentication and endpoint configuration are handled by the MCP server.

---

## MCP Server Setup

Add the Lumina Web MCP server to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "lumina-web": {
      "command": "node",
      "args": ["./lumina-search-mcp-server/build/index.js"],
      "env": {
        "LUMINA_ENDPOINT": "https://api.copilotlumina.com",
        "LUMINA_BEARER_TOKEN": "<your-token>"
      }
    }
  }
}
```

The server resolves configuration from: env vars > project-local `lumina-config.json`.

| Environment | Endpoint |
|-------------|----------|
| Production | `https://api.copilotlumina.com` |
| SDF | `https://api.sdf.copilotlumina.com` |

---

## MCP Tools

### `lumina_search` — Web Search

Search the web using Bing. Returns result snippets with `pageContext` references for opening full pages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | yes | Search query text |
| `topN` | integer | no | Max results to return |
| `recency` | integer | no | Days for recency filter (0 = no filter) |
| `source` | string | no | Data source (default: `"web_with_bing"`) |
| `domains` | string[] | no | Restrict to specific domains |
| `language` | string | no | ISO language code (e.g., `"en"`) |
| `countryCode` | string | no | ISO country code (e.g., `"us"`) |
| `market` | string | no | Market locale (e.g., `"en-US"`) |
| `tool_state` | object | no | ToolState from a prior call |

**Returns**: `{ results, toolState, pageId, pageContext, cursorContext, cardResults, searchResponseMetadataList }` — each result has `url`, `title`, `content`/`semanticDocument`, `pageContext`, `answerType`, `datePublished`, `dateLastCrawled`, `language`, `siteSource`, `q`, `source`, `snippets`, `remainingLines`.

### `lumina_open` — Open Page

Open a web page to retrieve its full content. Provide either `page_context` or `url`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_context` | object | one of | PageContextInfo from a prior search/open result |
| `id` | integer | conditional | External link index on an opened page. **Only used when `page_context.action` is `"view"`** — see `id` rules below. |
| `url` | string | one of | Direct URL to open |
| `line_no` | integer | no | Start line number (default: 0) |
| `num_lines` | integer | no | Lines to return (for pagination) |
| `tool_state` | object | no | ToolState from a prior call |

**Returns**: `{ pages, toolState }` — each page has `url`, `title`, `content`, `structuredDocument` (with `template`, `links`, `imageLinks`), `pageContext`, `cursorContext`, `totalLines`, `success`, `error`, `dependencyTraceId`.

### `lumina_find` — Find in Page

Find text within an already-opened page. Supports pattern matching and semantic search.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_context` | object | yes | PageContextInfo from a prior search/open result |
| `id` | integer | conditional | External link index on an opened page. **Only used when `page_context.action` is `"view"`** — see `id` rules below. |
| `pattern` | string | yes | Text pattern to find |
| `query_type` | string | no | `"pattern"` (default) or `"semantic"` |
| `tool_state` | object | yes | ToolState from a prior call |

**Returns**: `{ results, toolState, indexedResults }` — each result has `pageId`, `content`, `template` (with link placeholders), `lineIdx`, `links`, `imageLinks`, `pageContext`, `cursorContext`.

### `page_context.id` vs outer `id` — Important Rules

Both `lumina_open` and `lumina_find` accept a `page_context` object and an outer `id` parameter. These serve different purposes depending on the `page_context.action`:

| `page_context.action` | `page_context.id` | Outer `id` |
|------------------------|-------------------|------------|
| `"search"` | **Required** — identifies the search result set | **Not needed** — search results have no external links |
| `"view"` | **Required** — identifies which opened page (0, 1, 2… when multiple pages are open) | **Required** — specifies which external link on that page to follow |

- **`page_context.id`** always identifies the page/result set itself.
- **Outer `id`** only applies to `"view"` actions where the opened page has external links (shown as `[[[link_N]]]` placeholders in the template). It is the index into that page's links array.

---

## ToolState — Session Continuity

Every tool response includes an updated `toolState`. Always pass the **latest** `toolState` to the next tool call via the `tool_state` parameter.

```
lumina_search response → toolState S1
lumina_open(tool_state: S1) response → toolState S2
lumina_find(tool_state: S2) response → toolState S3
```

The MCP server manages `toolState` threading, authentication, and LuminaContext generation automatically.

---

## Dataflow & Orchestration Patterns

The LLM decides which tool to call based on the user's intent.

### Pattern 1: Search-first (most common)

```
lumina_search → (review results) → lumina_open → lumina_find
```

1. Call `lumina_search` with a query. Returns result snippets + `pageContext`.
2. Pick the best result(s) — call `lumina_open` with the result's `pageContext` and `tool_state`.
3. Optionally call `lumina_find` to locate specific text within the opened page.

### Pattern 2: Open-first (direct URL)

```
lumina_open (by url) → lumina_find
lumina_open (by url) → lumina_search
```

1. Call `lumina_open` with a `url` when you already know the page.
2. Use `lumina_find` to search within the page, or `lumina_search` for related queries.

### Pattern 3: Search → Find (skip Open)

```
lumina_search → lumina_find
```

1. Call `lumina_search` to get results with `pageContext`.
2. Call `lumina_find` directly using a result's `pageContext` — works if the page content is already in the `toolState`.

### Constraint: lumina_find cannot start a flow

`lumina_find` always requires a `pageContext` from a prior `lumina_search` or `lumina_open` call. It cannot be the first tool called.

### Pattern 4: Follow external links from a page

```
lumina_open → (page has links in structuredDocument/template) → lumina_open (with page_context action=view, id=linkIndex)
```

1. Call `lumina_open` to get a page. The response includes `structuredDocument` with `links` array and a `template` with `[[[link_N]]]` placeholders.
2. To follow a link, call `lumina_open` again with the page's `pageContext` and `id` set to the link's `linkId` position in the links array.

### Decision Logic

```
User wants to search the web?
  → Call lumina_search

User has a specific URL to read?
  → Call lumina_open with url

Need full content of a search result?
  → Call lumina_open with page_context from search result

Need to find specific text in a page?
  → Call lumina_find with page_context (page must exist in toolState)

Search results insufficient?
  → Refine query and call lumina_search again
  → Or lumina_open promising results for full content

Page too long, need specific section?
  → Call lumina_find with pattern or semantic query
  → Or call lumina_open with line_no/num_lines for pagination
```

---

## Complete Workflow Example

```
// Step 1: Search for information
lumina_search(q: "Azure Functions deployment best practices", topN: 5)
// Response: { results: [...], toolState: S1 }

// Step 2: Open the most relevant result for full content
lumina_open(page_context: results[0].pageContext, num_lines: 300, tool_state: S1)
// Response: { pages: [...], toolState: S2 }

// Step 3: Find specific section in the page
lumina_find(page_context: pages[0].pageContext, pattern: "deployment slots", query_type: "semantic", tool_state: S2)
// Response: { results: [...], toolState: S3 }
```

---

## Full API Schema Reference

For complete field definitions including `SearchRequestAdditionalConfig`, `RichCardsRequest`, `ErrorDetail`, `DocumentInfo`, and all enum values, see [references/api-schema.md](references/api-schema.md).
