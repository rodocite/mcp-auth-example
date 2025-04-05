import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Router } from "./router.js";
import { setCorsHeaders, handleOptionsRequest } from "../utils/cors.js";

/**
 * HTTP server with routing and error handling
 */
export class HttpServer {
  private router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  /**
   * Start the HTTP server
   */
  start(port: number = 3001, host: string = "::") {
    const server = createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        this.handleError(req, res, err);
      });
    });

    server.listen(port, host, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

    return server;
  }

  /**
   * Handle an incoming request
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // Skip processing if the request has already been handled
    if ((req as any).__handled) {
      return;
    }

    // Set CORS headers for all requests
    setCorsHeaders(req, res);

    // Handle OPTIONS requests (CORS preflight)
    if (req.method === "OPTIONS") {
      handleOptionsRequest(req, res);
      return;
    }

    // Route the request
    const routeMatched = await this.router.handleRequest(req, res);

    // If no route matched, return 404
    if (!routeMatched && !res.writableEnded) {
      res.writeHead(404).end("Not Found");
    }
  }

  /**
   * Handle errors in request processing
   */
  private handleError(
    req: IncomingMessage,
    res: ServerResponse,
    err: Error
  ): void {
    console.error("Unhandled error in request handler:", err);

    if (!res.writableEnded) {
      res.writeHead(500).end("Internal Server Error");
    }
  }
}
