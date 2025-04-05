import { IncomingMessage, ServerResponse } from "node:http";

/**
 * Handles requests for OAuth 2.0 Protected Resource Metadata
 *
 * This endpoint implements the /.well-known/oauth-protected-resource discovery specification
 * which allows OAuth clients to discover information about the protected resource.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-oauth-resource-metadata
 */
export async function protectedResourceHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  console.log("\n📡 STEP 1: Received MCP Resource Metadata Request");
  console.log("     Client requesting: /.well-known/oauth-protected-resource");
  
  // Build the protected resource metadata that points directly to Dex's OIDC config
  const metadata = {
    resource_name: "My MCP Server",
    authorization_servers: ["http://localhost:5558"],
  };

  console.log(`     Responding with authorization_servers: ${JSON.stringify(metadata.authorization_servers)}`);
  
  // Set response headers for JSON content
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);

  // Return the metadata as JSON
  res.end(JSON.stringify(metadata, null, 2));
  
  console.log("     ✅ Resource Metadata JSON sent");
  console.log("     ⏩ Next: Client will parse JSON and find authorization_servers");
}
