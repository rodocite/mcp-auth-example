import { IncomingMessage, ServerResponse } from "node:http";
import { getTransport } from "../mcp";
import { verifyToken, decodeToken } from "../auth/tokenValidator";

// Auth configuration
export interface AuthConfig {
  // The URL to redirect to for authentication
  authLoginUrl: string;
  // Whether to include the original URL as a returnTo parameter
  includeReturnUrl: boolean;
}

export const authConfig: AuthConfig = {
  // The URL to redirect to for authentication
  authLoginUrl: "/auth/login",
  // Whether to include the original URL as a returnTo parameter
  includeReturnUrl: true,
};

/**
 * Configure auth settings
 */
export function configureAuth(config: Partial<AuthConfig>): void {
  Object.assign(authConfig, config);
}

/**
 * Helper function to handle unauthorized responses
 */
function handleUnauthorized(
  req: IncomingMessage,
  res: ServerResponse,
  errorMessage: string
): void {
  // If the URL is for a well-known route, let it pass through
  if (req.url?.includes("/.well-known/")) {
    return;
  }

  console.error(errorMessage);
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: errorMessage }));
}

/**
 * Extract token from request
 */
export function extractToken(req: IncomingMessage): { token: string | null, source: string } {
  let token: string | null = null;
  let source: string = "none";

  // Find token in any header with the name 'authorization' (case-insensitive)
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === 'authorization') {
      const authHeader = Array.isArray(value) ? value[0] : value as string;
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        token = authHeader.substring(7);
        source = "Authorization header";
        break;
      }
    }
  }

  // If not found, check URL parameter
  if (!token && req.url?.includes("?")) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      token = url.searchParams.get("access_token");
      if (token) {
        source = "URL parameter";
      }
    } catch (error) {
      console.error("Error parsing URL for token:", error);
    }
  }

  // If still not found, check cookies
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'access_token') {
        token = value;
        source = "Cookie";
        break;
      }
    }
  }

  // Check for token in request body (POST requests)
  if (!token && req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    // This requires body parsing which might have been done in another middleware
    // We'll only check if it exists
    const body = (req as any).body;
    if (body && body.token) {
      token = body.token;
      source = "Request body";
    }
  }

  return { token, source };
}

/**
 * Full authentication middleware with JWT validation
 */
export async function authMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): Promise<void> {
  try {
    // Skip auth for discovery endpoints and OPTIONS requests
    if (
      req.url?.includes("/.well-known/") ||
      req.method === "OPTIONS" ||
      req.url === "/ping"
    ) {
      return next();
    }

    // Check if this is a messages request with a sessionId
    if (req.url?.startsWith("/messages") && req.url?.includes("sessionId=")) {
      try {
        // Parse the URL to get the sessionId
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const sessionId = url.searchParams.get("sessionId");
        
        // If we have a sessionId and it corresponds to a valid transport,
        // consider the request authenticated
        if (sessionId && getTransport(sessionId)) {
          console.log(`Request to ${req.url} authenticated via valid sessionId`);
          return next();
        }
      } catch (error) {
        console.error("Error parsing URL for sessionId:", error);
      }
    }

    // Extract token from request
    const { token, source } = extractToken(req);

    // If no token, return unauthorized
    if (!token || token.trim() === "") {
      handleUnauthorized(req, res, `No valid token provided for request to ${req.url}`);
      return;
    }

    // Log token info for debugging
    console.log(`Found token via ${source} for URL: ${req.url}`);
    
    try {
      // Perform actual token validation against Dex
      const decodedToken = await verifyToken(token);
      
      // Log successful verification
      console.log("Token verified successfully:", {
        sub: decodedToken.sub,
        exp: new Date(decodedToken.exp! * 1000).toISOString(),
        iss: decodedToken.iss
      });
      
      // Continue to the next handler
      next();
    } catch (error: unknown) {
      // Check if token expired
      if (error instanceof Error && error.message.includes("expired")) {
        handleUnauthorized(req, res, "Unauthorized - Token expired");
        return;
      }
      
      // Other verification errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      handleUnauthorized(req, res, `Token verification failed: ${errorMessage}`);
      return;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Internal Server Error during authentication" })
    );
  }
}

/**
 * Simplified authentication middleware that only checks token presence
 * but can optionally perform full validation
 */
export async function simpleAuthMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  validateToken: boolean = false
): Promise<void> {
  try {
    // Skip auth for discovery endpoints and OPTIONS requests
    if (
      req.url?.includes("/.well-known/") ||
      req.method === "OPTIONS" ||
      req.url === "/ping"
    ) {
      return next();
    }

    // Check if this is a messages request with a sessionId
    if (req.url?.startsWith("/messages") && req.url?.includes("sessionId=")) {
      try {
        // Parse the URL to get the sessionId
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const sessionId = url.searchParams.get("sessionId");
        
        // If we have a sessionId and it corresponds to a valid transport,
        // consider the request authenticated
        if (sessionId && getTransport(sessionId)) {
          console.log(`Request to ${req.url} authenticated via valid sessionId`);
          return next();
        }
      } catch (error) {
        console.error("Error parsing URL for sessionId:", error);
      }
    }

    // For debugging - print request URL
    console.log(`Request URL: ${req.url}`);

    // Extract token from request
    const { token, source } = extractToken(req);

    if (!token || token.trim() === "") {
      console.error(`Authentication failed: No token provided in request to ${req.url}`);
      res.writeHead(401);
      res.end(
        JSON.stringify({
          error: "Unauthorized",
          code: 401,
          message: "No valid token provided",
        })
      );
      return;
    }

    // If full validation is requested, verify the token
    if (validateToken) {
      try {
        console.log(`\n🔒 STEP 7: MCP Request with Access Token Authentication`);
        console.log(`     Validating token for ${req.url} via ${source}...`);
        
        // Verify token against Dex
        const decodedToken = await verifyToken(token);
        
        // Show detailed token info
        console.log("     ✅ Token validation successful:", {
          sub: decodedToken.sub,
          exp: new Date(decodedToken.exp! * 1000).toISOString(),
          iat: decodedToken.iat ? new Date(decodedToken.iat * 1000).toISOString() : 'unknown',
          iss: decodedToken.iss,
          aud: decodedToken.aud
        });
        
        console.log(`\n🛠️ STEP 8: Begin standard MCP message exchange`);
      } catch (error: unknown) {
        console.error("     ❌ Token validation failed:", error instanceof Error ? error.message : 'Unknown error');
        res.writeHead(401);
        res.end(
          JSON.stringify({
            error: "Unauthorized",
            code: 401,
            message: `Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        );
        return;
      }
    } else {
      // Just log token contents without validation
      try {
        const decoded = decodeToken(token);
        console.log(`\n🔒 STEP 7: MCP Request with Access Token (not verified)`);
        console.log("     Token decoded:", {
          sub: decoded.sub,
          exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown',
          iss: decoded.iss || 'unknown'
        });
        
        console.log(`\n🛠️ STEP 8: Begin standard MCP message exchange`);
      } catch (error: unknown) {
        console.error("     Token decode error:", error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Token exists and passes validation if required
    console.log(`Authentication succeeded: Token found via ${source}. URL: ${req.url}`);
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
