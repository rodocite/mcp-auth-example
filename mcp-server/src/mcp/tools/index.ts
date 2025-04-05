import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { echoTool } from "./echo";
import { calculatorTool } from "./calculator";
import { weatherTool } from "./weather";
// All available tools
const tools: McpTool[] = [
  // echoTool,
  calculatorTool,
  weatherTool,
  // Add more tools here as needed
];

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: McpServer): void {
  for (const tool of tools) {
    server.tool(tool.name, tool.schema, tool.handler);
    console.log(`Registered tool: ${tool.name}`);
  }
}