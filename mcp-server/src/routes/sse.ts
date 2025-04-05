import { IncomingMessage, ServerResponse } from "node:http";
import {
  getMcpServer,
  createSseTransport,
  getTransport,
  removeTransport,
} from "../mcp";
import { setCorsHeaders } from "../utils/cors";

/**
 * Handle SSE connection setup
 */
export async function sseConnectionHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Create the transport (this sets up the SSE connection)
  const transport = createSseTransport("/messages", res);

  // Make sure our custom headers are set after the transport is created
  // This ensures we don't lose our CORS headers
  setCorsHeaders(req, res);

  // Log the token status for debugging
  if (req.headers.authorization) {
    console.log("\n🔒 Establishing authenticated SSE connection");
    console.log("     SSE connection with valid auth token");
  } else {
    console.log("\n⚠️ SSE connection without auth token - authentication will be required");
  }

  res.on("close", async () => {
    removeTransport(transport.sessionId);
    console.log(`     Client disconnected: ${transport.sessionId}`);
  });

  try {
    await getMcpServer().connect(transport);
    console.log(`\n🛠️ STEP 8: Begin standard MCP message exchange`);
    console.log("     SSE Connection established, session: " + transport.sessionId.substring(0, 8) + "...");
    
    await transport.send({
      jsonrpc: "2.0",
      method: "sse/connection",
      params: { message: "SSE Connection established" },
    });
    
    console.log("     ✅ MCP server ready for message exchange");
  } catch (err) {
    console.error("❌ Error connecting to server:", err);
    if (!res.writableEnded) {
      res.writeHead(500).end("Error connecting to server");
    }
  }
}

export async function sseMessagesHandler(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<void> {
  // The sessionId is initially created when a client connects through sseConnectionHandler
  // and createSseTransport generates a unique ID for that connection.
  // Clients must include this same sessionId in the URL of subsequent requests
  // so the server knows which specific connection they're referring to.
  const urlObj = url.startsWith("http")
    ? new URL(url)
    : new URL(url, `http://${req.headers.host || "localhost"}`);

  // Set CORS headers first to ensure they're always included
  setCorsHeaders(req, res);

  const sessionId = urlObj.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end(JSON.stringify({ error: "No sessionId provided" }));
    return;
  }

  // If we have a valid sessionId, the connection is already authenticated
  // So we can look up the transport even if no token is in this specific request
  const activeTransport = getTransport(sessionId);
  if (!activeTransport) {
    console.error(`❌ No active transport found for session ${sessionId}`);
    res.writeHead(404).end(JSON.stringify({ error: "Session not found or expired" }));
    return;
  }

  console.log(`\n📨 Processing message for MCP session ${sessionId.substring(0, 8)}...`);

  try {
    // The SSE transport's handlePostMessage method will process
    // the incoming message and relay it to the MCP server
    await activeTransport.handlePostMessage(req, res);
    console.log("     ✅ Message processed successfully");
  } catch (err) {
    console.error("❌ Error handling message:", err);
    if (!res.writableEnded) {
      res.writeHead(500).end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}