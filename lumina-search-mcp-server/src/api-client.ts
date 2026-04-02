import axios, { AxiosInstance, AxiosError } from "axios";
import { createLuminaContext } from "./context.js";
import type { LuminaConfig } from "./config.js";

export interface ApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class LuminaApiClient {
  private client: AxiosInstance;

  constructor(config: LuminaConfig) {
    this.client = axios.create({
      baseURL: config.endpoint.replace(/\/$/, ""),
      headers: {
        Authorization: `Bearer ${config.bearerToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  async search(params: {
    q: string;
    topN?: number;
    recency?: number;
    source?: string;
    domains?: string[];
    language?: string;
    countryCode?: string;
    market?: string;
    toolState?: unknown;
  }): Promise<ApiResult> {
    const requestItem: Record<string, unknown> = { q: params.q };
    if (params.topN !== undefined) requestItem.topN = params.topN;
    if (params.recency !== undefined) requestItem.recency = params.recency;
    if (params.source !== undefined) requestItem.source = params.source;
    if (params.domains !== undefined) requestItem.domains = params.domains;
    if (params.language !== undefined) requestItem.language = params.language;
    if (params.countryCode !== undefined)
      requestItem.countryCode = params.countryCode;
    if (params.market !== undefined) requestItem.market = params.market;

    const body = {
      requests: [requestItem],
      toolState: params.toolState ?? null,
      context: createLuminaContext(),
    };
    return this.post("api/sonicberry/search", body);
  }

  async open(params: {
    pageContext?: unknown;
    id?: number;
    url?: string;
    lineNo?: number;
    numLines?: number;
    toolState?: unknown;
  }): Promise<ApiResult> {
    const requestItem: Record<string, unknown> = {};
    if (params.pageContext) {
      requestItem.pageContext = params.pageContext;
    } else if (params.url) {
      requestItem.refId = params.url;
    }
    if (params.id !== undefined) requestItem.id = params.id;
    if (params.lineNo !== undefined) requestItem.lineNo = params.lineNo;
    if (params.numLines !== undefined) requestItem.numLines = params.numLines;

    const body = {
      requests: [requestItem],
      toolState: params.toolState ?? null,
      context: createLuminaContext(),
    };
    return this.post("api/sonicberry/open", body);
  }

  async find(params: {
    pageContext: unknown;
    id?: number;
    pattern: string;
    queryType?: string;
    toolState: unknown;
  }): Promise<ApiResult> {
    const requestItem: Record<string, unknown> = {
      pageContext: params.pageContext,
      pattern: params.pattern,
      queryType: params.queryType ?? "pattern",
    };
    if (params.id !== undefined) requestItem.id = params.id;

    const body = {
      requests: [requestItem],
      toolState: params.toolState,
      context: createLuminaContext(),
    };
    return this.post("api/sonicberry/find", body);
  }

  private async post(path: string, body: unknown): Promise<ApiResult> {
    try {
      const response = await this.client.post(path, body);
      return { success: true, data: response.data };
    } catch (err) {
      const error = err as AxiosError;
      const status = error.response?.status;
      const detail = error.response?.data;
      const message = status
        ? `Lumina API error (HTTP ${status}): ${JSON.stringify(detail)}`
        : `Lumina API request failed: ${error.message}`;
      console.error(`[lumina-web-mcp] ${message}`);
      return { success: false, error: message };
    }
  }
}
