/**
 * MCP Reference Client
 *
 */

import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse";
import { startOAuthFlow } from "./auth/oauth";
import { getMcpClient, connectWithToken } from "./utils/mcpClient";
import { MCP_SERVER_URL } from "./config";
import { URL } from "url";

/**
 * Main application entry point
 */
async function main() {
  console.log(`Initializing MCP client for server: ${MCP_SERVER_URL}`);

  // Initialize MCP client
  const client = getMcpClient();

  try {
    // Step 1: Try to connect without authentication
    console.log("Attempting direct connection to MCP server...");

    // Create a basic transport without auth
    const basicTransport = new SSEClientTransport(
      new URL(`${MCP_SERVER_URL}/sse`)
    );

    await client.connect(basicTransport);
    console.log("Connected to MCP server without authentication");
  } catch (error: any) {
    // Step 2: If authentication is required, start OAuth flow
    if (error.code === 401) {
      console.log("Authentication required. Starting OAuth flow...");

      try {
        // Get access token through OAuth flow
        const token = await startOAuthFlow();

        // Connect with the obtained token
        await connectWithToken(client, token);
      } catch (authError) {
        console.error("Authentication failed:", authError);
        process.exit(1);
      }
    } else {
      console.error("Failed to connect to MCP server:", error);
      process.exit(1);
    }
  }

  console.log("MCP client initialized and connected successfully");
}

// Run the application
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
