/**
 * MCP Reference Server
 *
 */

import { Router } from "./server/router";
import { HttpServer } from "./server/http-server";
import { sseConnectionHandler, sseMessagesHandler } from "./routes/sse";
import { protectedResourceHandler } from "./routes/protected-resource";
import { initializeMcpServer } from "./mcp";
import { simpleAuthMiddleware, authMiddleware } from "./middleware/auth";

// Initialize MCP server with tools
initializeMcpServer();

// Configure routes
const router = new Router();

router.use((req, res, next) => simpleAuthMiddleware(req, res, next, true));
console.log("Using simplified auth middleware with token validation");
router.get("/.well-known/oauth-protected-resource", protectedResourceHandler);

// SSE routes (require authentication)
router.get("/sse", sseConnectionHandler);
router.post("/messages*", sseMessagesHandler);

// Start the server
const server = new HttpServer(router);
server.start();

// Handle process termination
process.on("SIGINT", () => {
  console.log("Server shutting down...");
  process.exit(0);
});

console.log("Server initialized and routes configured");
