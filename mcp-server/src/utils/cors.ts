import { IncomingMessage, ServerResponse } from "node:http";

/**
 * Handle CORS headers for the request
 */
export function setCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse
): void {
  // Set client origin (from port 3000, not 3001)
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  
  // These headers are needed for all requests
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Cache-Control, Pragma");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  
  // Set content type based on the endpoint
  if (req.url?.includes('/sse')) {
    // For SSE endpoints, set text/event-stream content type
    // Don't set Content-Type for OPTIONS requests as it causes issues
    if (req.method !== 'OPTIONS') {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
    }
  } else if (req.method !== 'OPTIONS') {
    // For all other endpoints except OPTIONS
    res.setHeader("Content-Type", "application/json");
  }
}

/**
 * Handle preflight OPTIONS requests
 */
export function handleOptionsRequest(
  req: IncomingMessage,
  res: ServerResponse
): void {
  setCorsHeaders(req, res);
  res.writeHead(204);
  res.end();
}
