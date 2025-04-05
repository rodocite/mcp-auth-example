import { IncomingMessage, ServerResponse } from "node:http";

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: string
) => Promise<void> | void;

type MiddlewareHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => Promise<void> | void;

interface Route {
  method: string;
  path: string | RegExp;
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];
  private middleware: MiddlewareHandler[] = [];

  /**
   * Register a middleware function
   */
  use(middleware: MiddlewareHandler): Router {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Register a GET route handler
   */
  get(path: string | RegExp, handler: RouteHandler): Router {
    this.routes.push({ method: "GET", path, handler });
    return this;
  }

  /**
   * Register a POST route handler
   */
  post(path: string | RegExp, handler: RouteHandler): Router {
    this.routes.push({ method: "POST", path, handler });
    return this;
  }

  /**
   * Register route handlers for all methods
   */
  all(path: string | RegExp, handler: RouteHandler): Router {
    this.routes.push({ method: "ALL", path, handler });
    return this;
  }

  /**
   * Find matching route and execute handler
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const { method, url } = req;

    if (!url || !method) {
      return false;
    }

    // Match routes
    for (const route of this.routes) {
      // Check if method matches
      if (route.method !== "ALL" && route.method !== method) {
        continue;
      }

      // Check if path matches
      let isMatch = false;
      if (typeof route.path === "string") {
        if (route.path === "*") {
          isMatch = true;
        } else if (route.path.endsWith("*")) {
          const prefix = route.path.slice(0, -1);
          isMatch = url.startsWith(prefix);
        } else {
          isMatch = route.path === url;
        }
      } else if (route.path instanceof RegExp) {
        isMatch = route.path.test(url);
      }

      if (isMatch) {
        // Apply middleware chain
        if (this.middleware.length > 0) {
          try {
            await this.executeMiddlewareChain(req, res, 0, async () => {
              await route.handler(req, res, url);
            });
          } catch (error) {
            console.error("Middleware chain error:", error);
            if (!res.writableEnded) {
              res.writeHead(500).end("Internal Server Error");
            }
          }
        } else {
          // No middleware, just execute the handler
          await route.handler(req, res, url);
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Execute middleware chain recursively
   */
  private async executeMiddlewareChain(
    req: IncomingMessage,
    res: ServerResponse,
    index: number,
    finalHandler: () => Promise<void>
  ): Promise<void> {
    // If we've gone through all middleware, execute the final handler
    if (index >= this.middleware.length) {
      return finalHandler();
    }

    // Execute the current middleware, passing a next function to call the next middleware
    return this.middleware[index](req, res, async () => {
      // Skip to the next middleware if the response wasn't already sent
      if (!res.writableEnded) {
        await this.executeMiddlewareChain(req, res, index + 1, finalHandler);
      }
    });
  }
}
