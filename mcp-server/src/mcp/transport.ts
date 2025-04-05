import { ServerResponse } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Store active transports by sessionId
const activeTransports: Record<string, SSEServerTransport> = {};

/**
 * Create a new SSE transport and register it
 */
export function createSseTransport(
  path: string,
  res: ServerResponse
): SSEServerTransport {
  const transport = new SSEServerTransport(path, res);
  activeTransports[transport.sessionId] = transport;
  return transport;
}

/**
 * Get an active transport by session ID
 */
export function getTransport(
  sessionId: string
): SSEServerTransport | undefined {
  return activeTransports[sessionId];
}

/**
 * Remove an active transport
 */
export function removeTransport(sessionId: string): void {
  delete activeTransports[sessionId];
}
