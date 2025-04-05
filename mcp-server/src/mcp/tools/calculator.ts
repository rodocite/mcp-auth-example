import { z } from "zod";

/**
 * Calculator tool - performs basic math operations
 */
export const calculatorTool: McpTool = {
  name: "calculator",
  schema: {
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  },
  handler: async (args: Record<string, any>, _extra: any) => {
    const { operation, a, b } = args;
    let result: number;
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          return {
            content: [{ type: "text", text: "Error: Division by zero" }],
          };
        }
        result = a / b;
        break;
      default:
        return {
          content: [
            { type: "text", text: `Error: Unknown operation ${operation}` },
          ],
        };
    }

    return {
      content: [
        {
          type: "text",
          text: `Result of ${operation} ${a} and ${b}: ${result}`,
        },
      ],
    };
  },
};
