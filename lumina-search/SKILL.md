---
name: lumina-search
description: Lumina Search Service APIs for web search, page retrieval, and in-page text finding. Provides three tools — Search (web search via Bing), Open (fetch full page content by URL or search result reference), and Find (search text patterns within opened pages). Use when users ask to search the web, look up information online, open/read web pages, or find specific content within web pages. Also use when building workflows that need grounded web search results.
---

# Lumina Search Service

Three HTTP POST APIs for web search, page content retrieval, and in-page text search. All share a `ToolState` session object that flows between calls.

---

## Server Configuration

The Lumina endpoint varies by environment. Configure it via **environment variables** or a **config file** — environment variables take precedence.

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LUMINA_ENDPOINT` | Base URL for the Lumina API | `https://api.copilotlumina.com` |
| `LUMINA_BEARER_TOKEN` | Bearer token for authentication | `eyJhbGciOi...` |

### Config File

Create a `lumina-config.json` in the project root or `~/.lumina/config.json`:

```json
{
  "endpoint": "https://api.copilotlumina.com",
  "bearerToken": "eyJhbGciOi..."
}
```

### Resolution Order

1. Environment variable `LUMINA_ENDPOINT` / `LUMINA_BEARER_TOKEN` (highest priority)
2. Project-local `lumina-config.json`
3. User-level `~/.lumina/config.json`

### Known Environments

| Environment | Endpoint |
|-------------|----------|
| Production | `https://api.copilotlumina.com` |
| SDF | `https://api.sdf.copilotlumina.com` |
| Custom | Set via `LuminaExperimentServiceEndpoint` config override |

---

## Authentication

All Lumina API calls require a **Bearer token** in the `Authorization` header.

```
Authorization: Bearer <token>
Content-Type: application/json
```

The token is resolved from configuration (see [Server Configuration](#server-configuration) above). Every HTTP request to any of the three APIs must include this header. Requests without a valid token will receive a `401 Unauthorized` response.

---

## API Overview

| API | Path | Purpose | Requires ToolState? |
|-----|------|---------|---------------------|
| **Search** | `api/sonicberry/search` | Web search via Bing | No (first call) |
| **Open** | `api/sonicberry/open` | Open a page by reference or URL | Yes (from Search or prior Open) |
| **Find** | `api/sonicberry/find` | Find text in an opened page | Yes (page must be opened first) |

All APIs are batch-capable (accept arrays of request items).

---

## ToolState — Session Continuity

`ToolState` is the session object propagated across all API calls. Every response returns an updated `ToolState` — always pass the **latest** one to the next call.

```json
{
  "sessionId": "unique-session-id",
  "pages": {
    "pageId1": { "urls": [...], "imageUrls": [...] }
  }
}
```

---

## Dataflow & Orchestration Patterns

The LLM decides which API to call based on the user's intent. The three valid starting points and flow patterns:

### Pattern 1: Search-first (most common)

```
Search → (review results) → Open (get full page) → Find (locate specific text)
```

1. Call **Search** with a query. Returns result snippets + `pageContext` for each result.
2. Decide which result(s) need more detail — call **Open** with the result's `pageContext`.
3. Optionally call **Find** to locate specific text within the opened page.

### Pattern 2: Open-first (direct URL)

```
Open (by URL) → Find (locate specific text)
Open (by URL) → Search (related queries)
```

1. Call **Open** with a `refId` (direct URL) when you already know the page.
2. Use **Find** to search within the page, or **Search** for related queries.

### Pattern 3: Search → Find (skip Open)

```
Search → Find (search within a result's content)
```

1. Call **Search** to get results with `pageContext`.
2. Call **Find** directly using a result's `pageContext` — works if the page content is already in the ToolState.

### Constraint: Find cannot start a flow

**Find** always requires a `pageContext` from a prior Search or Open call. It cannot be the first API called.

### Decision Logic for the LLM

```
User wants to search the web?
  → Call Search

User has a specific URL to read?
  → Call Open with refId

Need full content of a search result?
  → Call Open with pageContext from Search result

Need to find specific text in a page?
  → Call Find with pageContext (page must exist in ToolState)

Search results insufficient?
  → Refine query and call Search again
  → Or Open promising results for full content

Page too long, need specific section?
  → Call Find with pattern or semantic query
  → Or call Open with lineNo/numLines for pagination
```

---

## API 1: Search

**POST** `api/sonicberry/search`

Performs web search via Bing. Returns result snippets with metadata.

### Request

```json
{
  "requests": [
    {
      "q": "search query text",
      "topN": 5,
      "recency": 7,
      "source": "web_with_bing",
      "domains": ["microsoft.com"],
      "language": "en",
      "countryCode": "us",
      "market": "en-US"
    }
  ],
  "toolState": null,
  "context": {
    "conversationId": "conv-id",
    "requestId": "req-id",
    "traceId": "trace-id",
    "partner": "partner-id"
  }
}
```

**Key request fields** (only `q` is required):

| Field | Description |
|-------|-------------|
| `q` | Search query text (required) |
| `topN` | Max results to return |
| `recency` | Days for recency filter (0 = no filter) |
| `domains` | Restrict to specific domains |
| `language` | ISO language code (e.g., `en`) |
| `market` | Market locale (e.g., `en-US`) |

### Response

```json
{
  "results": [
    {
      "url": "https://example.com/page",
      "title": "Page Title",
      "content": "Semantic document content (grounding text)...",
      "pageContext": { "pageId": "p1", "id": 0, "turn": 1, "action": "Search" },
      "answerType": "WebPages",
      "datePublished": "2024-01-15",
      "remainingLines": 150
    }
  ],
  "toolState": { "sessionId": "...", "pages": {...} },
  "errors": []
}
```

Each result includes:
- **`content`** — grounding text snippet (may be truncated)
- **`pageContext`** — pass this to Open or Find for more content
- **`remainingLines`** — indicates more content is available via Open

---

## API 2: Open

**POST** `api/sonicberry/open`

Opens a page to retrieve full content. Use either `pageContext` (from Search) or `refId` (direct URL).

### Request

```json
{
  "requests": [
    {
      "pageContext": { "pageId": "p1", "id": 0, "turn": 1, "action": "Search" },
      "lineNo": 0,
      "numLines": 200
    }
  ],
  "toolState": { "sessionId": "...", "pages": {...} }
}
```

**Or with a direct URL:**

```json
{
  "requests": [
    {
      "refId": "https://example.com/specific-page",
      "lineNo": 0,
      "numLines": 200
    }
  ],
  "toolState": { "sessionId": "...", "pages": {...} }
}
```

**Key request fields** (one of `pageContext` or `refId` is required):

| Field | Description |
|-------|-------------|
| `pageContext` | From a previous Search/Open result |
| `refId` | Direct URL to open |
| `lineNo` | Start line (default: 0) |
| `numLines` | Lines to return (for pagination) |

### Response

```json
{
  "pages": [
    {
      "url": "https://example.com/page",
      "title": "Page Title",
      "content": "Full page content text...",
      "pageContext": { "pageId": "p1", "id": 0, "turn": 1, "action": "View" },
      "success": true,
      "totalLines": 500,
      "pageId": "p1",
      "doc": {
        "links": [...],
        "imageLinks": [...]
      }
    }
  ],
  "toolState": { "sessionId": "...", "pages": {...} }
}
```

Use `lineNo` and `numLines` for incremental page loading when content is large.

---

## API 3: Find

**POST** `api/sonicberry/find`

Searches for text within an already-opened page. Supports pattern matching and semantic search.

### Request

```json
{
  "requests": [
    {
      "pageContext": { "pageId": "p1", "id": 0, "turn": 1, "action": "View" },
      "pattern": "search text or regex",
      "queryType": "pattern"
    }
  ],
  "toolState": { "sessionId": "...", "pages": {...} }
}
```

**Key request fields** (all required except `queryType`):

| Field | Description |
|-------|-------------|
| `pageContext` | Page to search within (required) |
| `pattern` | Text pattern to find (required) |
| `queryType` | `"pattern"` (default) or `"semantic"` |

### Response

```json
{
  "results": [
    {
      "pageId": "p1",
      "content": "Matched content text with surrounding context..."
    }
  ],
  "toolState": { "sessionId": "...", "pages": {...} }
}
```

---

## LuminaContext (Required Metadata)

Every API call should include a `context` object for tracing and routing:

```json
{
  "conversationId": "conversation-uuid",
  "requestId": "request-uuid",
  "traceId": "trace-uuid",
  "partner": "partner-id",
  "scenarioName": "Copilot",
  "trafficType": "Production"
}
```

Required fields: `conversationId`, `requestId`, `traceId`, `partner`.

---

## Complete Workflow Example

```
// Resolve config (env vars take precedence over config file)
endpoint = env.LUMINA_ENDPOINT ?? config.endpoint
token    = env.LUMINA_BEARER_TOKEN ?? config.bearerToken

// All requests use these headers:
headers = {
  "Authorization": "Bearer " + token,
  "Content-Type": "application/json"
}

// Step 1: Search for information
POST {endpoint}/api/sonicberry/search
Headers: Authorization: Bearer <token>
{
  "requests": [{ "q": "Azure Functions deployment best practices", "topN": 5 }],
  "context": { "conversationId": "c1", "requestId": "r1", "traceId": "t1", "partner": "agent" }
}
// Response: 5 results with pageContext, toolState

// Step 2: Open the most relevant result for full content
POST {endpoint}/api/sonicberry/open
Headers: Authorization: Bearer <token>
{
  "requests": [{ "pageContext": <from result[0].pageContext>, "numLines": 300 }],
  "toolState": <from search response>
}
// Response: full page content, updated toolState

// Step 3: Find specific section in the page
POST {endpoint}/api/sonicberry/find
Headers: Authorization: Bearer <token>
{
  "requests": [{ "pageContext": <from open response>, "pattern": "deployment slots", "queryType": "semantic" }],
  "toolState": <from open response>
}
// Response: matched content around "deployment slots"
```

---

## Full API Schema Reference

For complete field definitions including `SearchRequestAdditionalConfig`, `RichCardsRequest`, `ErrorDetail`, `DocumentInfo`, and all enum values, see [references/api-schema.md](references/api-schema.md).
