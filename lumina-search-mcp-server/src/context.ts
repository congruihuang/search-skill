import { v4 as uuidv4 } from "uuid";

export interface LuminaContext {
  conversationId: string;
  requestId: string;
  traceId: string;
  partner: string;
}

// Stable conversationId for the lifetime of this MCP server process
const sessionConversationId = uuidv4();

/**
 * Create a fresh LuminaContext for each API call.
 * conversationId is stable per server session; requestId and traceId are unique per call.
 */
export function createLuminaContext(): LuminaContext {
  return {
    conversationId: sessionConversationId,
    requestId: uuidv4(),
    traceId: uuidv4(),
    partner: "claude-code",
  };
}
