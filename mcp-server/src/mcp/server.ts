import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools";

// Create and configure the MCP server
const mcpServer = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

/**
 * Get the shared MCP server instance
 */
export function getMcpServer(): McpServer {
  return mcpServer;
}

/**
 * Initialize the MCP server with any required configurations
 */
export function initializeMcpServer(): void {
  // Register all tools
  registerTools(mcpServer);
  // Add any additional initialization logic here
  console.log("MCP Server initialized");
}
