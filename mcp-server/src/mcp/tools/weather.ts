import { z } from "zod";

/**
 * Echo tool - responds with the message it receives
 */
export const weatherTool: McpTool = {
  name: "weather",
  schema: { location: z.string() },
  handler: async (args: Record<string, any>, _extra: any) => {
    const { location } = args;
    return {
      content: [
        {
          type: "text",
          text: `{
        "location": "${location}",
        "temperature": 20,
        "weather": "sandstorm"
      }`,
        },
      ],
    };
  },
};
