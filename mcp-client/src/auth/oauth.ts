import * as http from "http";
import { URL } from "url";
import { exec } from "child_process";
import * as querystring from "querystring";
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, PORT } from "../config";

/**
 * Start the OAuth flow to get an access token
 */
export async function startOAuthFlow(): Promise<string> {
  try {
    console.log("\n🔄 === OAUTH FLOW SEQUENCE STARTED ===");
    
    // Step 1: Get OAuth resource configuration from MCP server
    console.log("\n📡 STEP 1: MCP Resource Metadata Request");
    console.log("     /.well-known/oauth-protected-resource");
    const resourceMetadata = await fetchResourceMetadata();
    console.log("     ✅ Resource Metadata received");
    
    // Step 2: Parse JSON and find authorization servers
    console.log("\n🔍 STEP 2: Parse JSON and find authorization_servers");
    const [authServerUrl] = resourceMetadata.authorization_servers;
    console.log(`     ✅ Found authorization server: ${authServerUrl}`);
    
    // Step 3: Get authorization server metadata
    console.log("\n📡 STEP 3: MCP Authorization Server Metadata Request");
    console.log("     /.well-known/openid-configuration");
    const serverMetadata = await fetchAuthServerMetadata(authServerUrl);
    console.log("     ✅ Authorization Server Metadata received");
    
    // Parse JSON and find OAuth endpoints
    console.log("\n🔍 STEP 3.5: Parse JSON and find OAuth endpoints");
    console.log(`     ✅ Found authorization_endpoint: ${serverMetadata.authorization_endpoint}`);
    console.log(`     ✅ Found token_endpoint: ${serverMetadata.token_endpoint}`);
    
    // Step 4: Open browser for authorization and wait for callback
    console.log("\n🌐 STEP 4: Redirect to Authorization Server");
    const code = await openAuthorizationWindow(serverMetadata.authorization_endpoint);
    console.log("\n✅ Received authorization code from callback");
    
    // Step 5: Exchange code for token
    console.log("\n🔑 STEP 5: Token request with authorization code");
    const tokenData = await exchangeCodeForToken(code, serverMetadata.token_endpoint);
    console.log("\n✅ Access token received successfully");
    
    // Step 6: Return token for MCP connection
    console.log("\n🔐 STEP 6: Ready for MCP request with Access Token");
    
    return tokenData.access_token;
  } catch (error) {
    console.error("❌ OAuth flow failed:", error);
    throw error;
  }
}

/**
 * Fetch OAuth protected resource metadata from MCP server
 */
async function fetchResourceMetadata(): Promise<{ authorization_servers: string[] }> {
  const resourceResponse = await fetch(
    "http://localhost:3001/.well-known/oauth-protected-resource"
  );

  if (!resourceResponse.ok) {
    throw new Error(
      `Failed to access protected resource: ${resourceResponse.status}`
    );
  }

  return await resourceResponse.json();
}

/**
 * Fetch authorization server metadata
 */
async function fetchAuthServerMetadata(authServerUrl: string): Promise<{
  authorization_endpoint: string;
  token_endpoint: string;
}> {
  // Use the OpenID Connect discovery endpoint instead of OAuth-specific endpoint
  const metadataUrl = `${authServerUrl}/.well-known/oauth-authorization-server`;
  console.log(`     Requesting: ${metadataUrl}`);
  
  const metadataResponse = await fetch(metadataUrl);

  if (!metadataResponse.ok) {
    throw new Error(
      `Failed to fetch authorization server metadata: ${metadataResponse.status}`
    );
  }

  return await metadataResponse.json();
}

/**
 * Open authorization window in browser and wait for callback with code
 */
function openAuthorizationWindow(authorizationEndpoint: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Build authorization URL
    const authUrl = new URL(authorizationEndpoint);
    authUrl.searchParams.append("client_id", CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "openid");
    
    // Set up callback server
    const server = http.createServer((req, res) => {
      if (req.url?.startsWith("/callback")) {
        try {
          console.log("\n📲 Processing callback with authorization code");
          
          // Parse query parameters
          const query = querystring.parse(req.url.split("?")[1] || "");
          
          // Check for error
          if (query.error) {
            const errorMessage = typeof query.error_description === "string" 
              ? query.error_description 
              : String(query.error_description || "");
              
            respondWithError(res, String(query.error), errorMessage);
            reject(new Error(`Authorization error: ${query.error}`));
            return;
          }
          
          // Extract code
          const code = query.code as string;
          if (!code) {
            respondWithError(res, "missing_code", "No authorization code received");
            reject(new Error("No authorization code received"));
            return;
          }
          
          // Success response
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
              <h1>Authentication Successful!</h1>
              <p>The authorization code has been received.</p>
              <div style="padding: 10px; background-color: #f0f0f0; border-radius: 4px; margin: 20px 0; word-break: break-all; text-align: left;">
                <code>${code.substring(0, 10)}...${code.substring(code.length - 10)}</code>
              </div>
              <p>You can close this window and return to the terminal.</p>
              <p><small>Part of the MCP Authorization Flow</small></p>
            </body>
            </html>
          `);
          
          // Close server and resolve with code
          server.close();
          resolve(code);
        } catch (error) {
          respondWithError(res, "server_error", "Internal server error");
          reject(error);
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Not found</h1></body></html>");
      }
    });
    
    // Start server and open browser
    server.listen(PORT, () => {
      console.log(`\n🔄 Starting browser authentication flow`);
      console.log(`     Callback server listening on port ${PORT}`);
      console.log("\n=== Authentication Instructions ===");
      console.log("1. Your browser will open to the authorization page");
      console.log("2. Log in and authorize the application");
      console.log("3. The browser will redirect back automatically");
      
      openBrowser(authUrl.toString());
    });
  });
}

/**
 * Exchange the authorization code for an access token
 */
async function exchangeCodeForToken(code: string, tokenEndpoint: string): Promise<{ 
  access_token: string; 
  token_type: string;
  expires_in?: number;
}> {
  // Prepare token request
  const tokenRequest = {
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  };

  // Create Basic Auth header
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  // Send token request
  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: querystring.stringify(tokenRequest),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  
  // Log a preview of the token (safely)
  const token = tokenData.access_token;
  console.log(`     Token received: ${token.substring(0, 15)}...${token.substring(token.length - 15)}`);

  return tokenData;
}

/**
 * Open browser to a URL
 */
function openBrowser(url: string): void {
  const command = process.platform === "win32" 
    ? "start" 
    : process.platform === "darwin" 
      ? "open" 
      : "xdg-open";

  exec(`${command} "${url}"`, (error) => {
    if (error) {
      console.error(`Failed to open browser: ${error}`);
      console.log(`Please manually open this URL in your browser: ${url}`);
    }
  });
}

/**
 * Respond with error to browser
 */
function respondWithError(
  res: http.ServerResponse,
  error: string,
  description: string
): void {
  res.writeHead(400, { "Content-Type": "text/html" });
  res.end(
    `<html><body>
      <h1>Authentication Error</h1>
      <p>${error}: ${description}</p>
      <p>Please close this window and return to the terminal.</p>
    </body></html>`
  );
} 