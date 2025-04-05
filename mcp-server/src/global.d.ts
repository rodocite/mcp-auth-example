import { z } from "zod";

/**
 * Interface for MCP tools
 */
declare global {
  interface McpTool {
    name: string;
    schema: Record<string, z.ZodType>;
    handler: (
      args: Record<string, any>,
      extra: any
    ) => Promise<{
      content: Array<{ type: "text"; text: string }>;
    }>;
  }
}

export {};
