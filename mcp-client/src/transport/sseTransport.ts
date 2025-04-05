import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse";
import { URL } from "url";
import { MCP_SERVER_URL } from "../config";
import { patchFetchWithToken } from "../auth/token";

/**
 * Create an SSE transport with authentication
 */
export async function createAuthenticatedTransport(token: string): Promise<SSEClientTransport> {
  // Patch fetch to include authorization headers
  patchFetchWithToken(token);
  
  // Create the SSE transport with the server URL
  const sseUrl = new URL(`${MCP_SERVER_URL}/sse`);
  return new SSEClientTransport(sseUrl);
} 