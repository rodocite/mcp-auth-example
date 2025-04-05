import { z } from "zod";

/**
 * Echo tool - responds with the message it receives
 */
export const echoTool: McpTool = {
  name: "echo",
  schema: { message: z.string() },
  handler: async (args: Record<string, any>, _extra: any) => {
    const { message } = args;
    return {
      content: [{ type: "text", text: `Tool echo: ${message}` }],
    };
  },
};
