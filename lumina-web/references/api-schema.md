# Lumina Search API — Full Schema Reference

Complete field definitions for all Lumina Search Service APIs derived from the JSON Schema specification.

---

## Table of Contents

- [Server Configuration](#server-configuration)
- [Authentication](#authentication)
- [Common Types](#common-types)
  - [ToolState](#toolstate)
  - [PageContextInfo](#pagecontextinfo)
  - [LuminaContext](#luminacontext)
  - [Configs](#configs)
- [Search API](#search-api)
  - [SearchRequest](#searchrequest)
  - [SearchRequestItem](#searchrequestitem)
  - [SearchRequestAdditionalConfig](#searchrequestadditionalconfig)
  - [RichCardsRequest](#richcardsrequest)
  - [SearchResponse](#searchresponse)
  - [SearchResultItem](#searchresultitem)
- [Open API](#open-api)
  - [OpenRequest](#openrequest)
  - [OpenRequestItem](#openrequestitem)
  - [OpenResponse](#openresponse)
  - [PageItem](#pageitem)
  - [DocumentInfo](#documentinfo)
  - [ErrorDetail](#errordetail)
- [Find API](#find-api)
  - [FindRequest](#findrequest)
  - [FindRequestItem](#findrequestitem)
  - [FindResponse](#findresponse)
  - [FindResultItem](#findresultitem)

---

## Server Configuration

The Lumina API base URL is environment-dependent. Resolve using this precedence:

1. **Environment variable** `LUMINA_ENDPOINT` (highest priority)
2. **Project config** `./lumina-config.json` → `endpoint` field

| Environment | Endpoint |
|-------------|----------|
| Production | `https://api.copilotlumina.com` |
| SDF | `https://api.sdf.copilotlumina.com` |
| Custom | Via `LuminaExperimentServiceEndpoint` override |

**Config file format** (`lumina-config.json`):

```json
{
  "endpoint": "https://api.copilotlumina.com",
  "bearerToken": "eyJhbGciOi..."
}
```

---

## Authentication

All APIs require a Bearer token. Resolve using this precedence:

1. **Environment variable** `LUMINA_BEARER_TOKEN` (highest priority)
2. **Project config** `./lumina-config.json` → `bearerToken` field

**Required HTTP headers on every request:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <token>` |
| `Content-Type` | `application/json` |

**Error responses:**

| Status | Meaning |
|--------|---------|
| `401 Unauthorized` | Missing or invalid Bearer token |
| `403 Forbidden` | Token valid but insufficient permissions |

---

## Common Types

### ToolState

Session state propagated across Search, Open, and Find operations.

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session identifier |
| `pages` | object | Map of `pageId` to `PageStateInfo` |

**PageStateInfo:**

| Field | Type | Description |
|-------|------|-------------|
| `urls` | string[] | URLs on the page |
| `imageUrls` | string[] | Image URLs on the page |

### PageContextInfo

Reference to a page across Search/Open/Find operations.

| Field | Type | Description |
|-------|------|-------------|
| `pageId` | string | Unique page identifier |
| `id` | integer | Numeric index within the result set |
| `turn` | integer | Conversation turn number when created |
| `action` | string | `"Search"` or `"View"` |
| `loc` | integer | Line offset location in content |
| `lines` | integer | Number of lines from `loc` |

### LuminaContext

Context metadata for tracing and routing. Required fields marked with *.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | string | * | Client conversation identifier |
| `requestId` | string | * | Client request identifier |
| `traceId` | string | * | Distributed tracing identifier |
| `partner` | string | * | Partner identifier |
| `userUtterance` | string | | User's original message text |
| `clientRequestId` | string | | Client-provided request ID |
| `correlationId` | string | | End-to-end correlation ID |
| `isDebugMode` | boolean | | Enable debug telemetry |
| `scenarioName` | string | | Enum: `Copilot`, `Copilot_Researcher`, `seval`, `Eureka` |
| `application` | string | | Application/scenario group name |
| `trafficType` | string | | Enum: `Test`, `Production` |
| `scenarioGroup` | string | | Enum: `Researcher`, `Mainline`, `Eureka` |

### Configs

| Field | Type | Description |
|-------|------|-------------|
| `experimentConfig` | object | Lumina experiment configuration (opaque to caller) |

---

## Search API

### SearchRequest

**POST** `api/sonicberry/search`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requests` | SearchRequestItem[] | yes | Array of search queries (batch-capable) |
| `toolState` | ToolState | no | Session state from previous operations (null on first call) |
| `configs` | Configs | no | Experiment configuration |
| `context` | LuminaContext | yes | Request context metadata |

### SearchRequestItem

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `q` | string | yes | — | Search query text |
| `topN` | integer | no | — | Maximum results to return |
| `recency` | integer | no | — | Days for recency filter (0 = no filter) |
| `source` | string | no | `"web_with_bing"` | Data source |
| `domains` | string[] | no | — | Restrict to these domains |
| `language` | string | no | — | ISO language code (e.g., `en`) |
| `countryCode` | string | no | — | ISO country code (e.g., `us`) |
| `userIpAddress` | string | no | — | Client IP for geolocation |
| `market` | string | no | — | Market locale (e.g., `en-US`) |
| `additionalConfig` | SearchRequestAdditionalConfig | no | — | Advanced search config |
| `cards` | RichCardsRequest | no | — | Rich cards configuration |

### SearchRequestAdditionalConfig

Advanced grounding API configuration options.

| Field | Type | Description |
|-------|------|-------------|
| `maxGroundingResults` | integer | Max grounding results |
| `maxGroundingResultSize` | integer | Max size (bytes) per grounding result |
| `maxNonWebAnswers` | integer | Max non-web answers (news, weather, finance) |
| `maxSnippetLength` | integer | Max snippet length |
| `maxSemanticDocumentLength` | integer | Max semantic document content length |
| `maxNewsItems` | integer | Max news items |
| `maxWeatherItems` | integer | Max weather items |
| `maxFinanceItems` | integer | Max finance items |
| `retrieval` | string | Retrieval strategy parameter |
| `p1` | string | P1 search config parameter |
| `traffic` | string | Traffic routing parameter |
| `debug` | string | Search diagnostics parameter |
| `privacy` | string | Privacy level parameter |
| `setLang` | string | Language override |
| `bypassPaywall` | boolean | Bypass paywall restrictions |
| `mobile` | boolean | Mobile client flag |
| `customConfig` | string | Custom configuration ID |
| `useCompliantIndex` | boolean | Use compliant search index |
| `enablePCM` | boolean | Enable Publisher Content Marketplace |
| `filter` | string[] | Search result filters |
| `sf` | string[] | Search features to enable |
| `customParams` | object (string→string) | Custom key-value parameters |
| `customGroundingHost` | string | Custom grounding host override |

### RichCardsRequest

| Field | Type | Description |
|-------|------|-------------|
| `multiCardView` | string | Enum: `"magazine"` |
| `renderForIsoComp` | boolean or null | Render for ISO compatibility |

### SearchResponse

| Field | Type | Description |
|-------|------|-------------|
| `results` | SearchResultItem[] | Array of search results |
| `toolState` | ToolState | Updated session state |
| `errors` | string[] | Error messages if any queries failed |

### SearchResultItem

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | URL of the result page |
| `title` | string | Title of the result page |
| `content` | string | Semantic document content (grounding text) |
| `pageContext` | PageContextInfo | Reference for subsequent Open/Find calls |
| `answerType` | string | Answer type (e.g., `WebPages`, `News`, `Videos`) |
| `datePublished` | string | Publication date |
| `siteSource` | string | Source site identifier |
| `query` | string | Query that produced this result |
| `licensedContent` | boolean or null | Whether content is licensed |
| `remainingLines` | integer or null | Remaining lines available via Open |

---

## Open API

### OpenRequest

**POST** `api/sonicberry/open`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requests` | OpenRequestItem[] | yes | Array of page open items (batch-capable) |
| `toolState` | ToolState | yes | Session state from previous operation |
| `configs` | Configs | no | Experiment configuration |
| `context` | LuminaContext | no | Request context metadata |

### OpenRequestItem

One of `pageContext` or `refId` is required.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pageContext` | PageContextInfo | one of | — | From a previous Search/Open result |
| `refId` | string | one of | — | Direct URL to open |
| `source` | string | no | `"web_with_bing"` | Data source |
| `enimgoutlinks` | boolean | no | — | Include image out-links |
| `lineNo` | integer | no | `0` | Start line number |
| `numLines` | integer | no | — | Lines of content to return |

### OpenResponse

| Field | Type | Description |
|-------|------|-------------|
| `pages` | PageItem[] | Array of opened page items |
| `toolState` | ToolState | Updated session state |

### PageItem

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | URL of the page |
| `title` | string | Title of the page |
| `content` | string | Page content text |
| `pageContext` | PageContextInfo | Page reference |
| `success` | boolean | Whether retrieval succeeded |
| `error` | string | Error code if failed |
| `errorMessage` | string | Error message if failed |
| `errorDetail` | ErrorDetail | Detailed error info |
| `dependencyTraceId` | string | Trace ID for dependency call |
| `doc` | DocumentInfo | Extracted links and images |
| `totalLines` | integer or null | Total lines in full page |
| `pageId` | string | Unique page identifier |

### DocumentInfo

| Field | Type | Description |
|-------|------|-------------|
| `links` | LinkInfo[] | Hyperlinks found in the page |
| `imageLinks` | LinkInfo[] | Image links found in the page |

### ErrorDetail

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | integer | HTTP status code |

---

## Find API

### FindRequest

**POST** `api/sonicberry/find`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requests` | FindRequestItem[] | yes | Array of find items (batch-capable) |
| `toolState` | ToolState | yes | Session state (page must be opened first) |
| `configs` | Configs | no | Experiment configuration |
| `context` | LuminaContext | no | Request context metadata |

### FindRequestItem

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pageContext` | PageContextInfo | yes | — | Page to search within |
| `pattern` | string | yes | — | Text pattern to find |
| `queryType` | string | no | `"pattern"` | `"pattern"` or `"semantic"` |

### FindResponse

| Field | Type | Description |
|-------|------|-------------|
| `results` | FindResultItem[] | Array of find results |
| `toolState` | ToolState | Updated session state |

### FindResultItem

| Field | Type | Description |
|-------|------|-------------|
| `pageId` | string | Page ID where pattern was found |
| `content` | string | Matched content text |
