import { Client } from "@modelcontextprotocol/sdk/client/index";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse";
import { decodeToken } from "../auth/token";
import { createAuthenticatedTransport } from "../transport/sseTransport";

/**
 * Get a configured MCP client
 */
export function getMcpClient(): Client {
  return new Client(
    {
      name: "my-mcp-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {},
      },
    }
  );
}

/**
 * Connect to MCP server with token
 */
export async function connectWithToken(client: Client, token: string): Promise<void> {
  try {
    console.log("\n🔒 === MCP CONNECTION WITH TOKEN ===");
    
    // Log token information for debugging
    const tokenInfo = decodeToken(token);
    console.log("\n📝 Token Information:");
    console.log(`     Subject: ${tokenInfo.payload.sub || 'unknown'}`);
    console.log(`     Issuer: ${tokenInfo.payload.iss || 'unknown'}`);
    console.log(`     Expiration: ${tokenInfo.payload.exp ? new Date(tokenInfo.payload.exp * 1000).toLocaleString() : 'unknown'}`);
    
    // Create an authenticated transport
    console.log("\n🔑 MCP Request with Access Token");
    console.log("     Creating authenticated transport with token");
    const transport = await createAuthenticatedTransport(token);
    
    // Connect to the MCP server
    console.log("     Connecting to MCP server...");
    await client.connect(transport);
    console.log("\n✅ Connected to MCP server successfully with token!");
    
    // List available tools
    console.log("\n🛠️ FINAL STEP: Begin standard MCP message exchange");
    const tools = await client.listTools();
    console.log(`     Available tools: ${JSON.stringify(tools)}`);
    console.log("\n🎉 Authentication flow complete: ready for MCP interaction");
    
    return;
  } catch (error) {
    console.error("\n❌ Failed to connect to MCP server with token:", error);
    throw error;
  }
} 