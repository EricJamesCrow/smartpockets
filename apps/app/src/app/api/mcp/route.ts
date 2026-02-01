// apps/app/src/app/api/mcp/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyMCPToken } from "@/lib/mcp/auth";
import { handleToolCall, getTools } from "@/lib/mcp/server";

/**
 * MCP Protocol Handler
 *
 * Handles MCP JSON-RPC requests over HTTP POST.
 * Requires Bearer token authentication via Clerk.
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get("authorization");
  const authResult = await verifyMCPToken(authHeader);

  if (!authResult) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Authentication required. Provide a valid Bearer token.",
        },
        id: null,
      },
      { status: 401 }
    );
  }

  // Parse JSON-RPC request
  let body: {
    jsonrpc: string;
    method: string;
    params?: Record<string, unknown>;
    id?: string | number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error: Invalid JSON",
        },
        id: null,
      },
      { status: 400 }
    );
  }

  const { method, params, id } = body;

  try {
    // Handle MCP methods
    switch (method) {
      case "initialize": {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "credit-cards-mcp",
              version: "1.0.0",
            },
          },
          id,
        });
      }

      case "tools/list": {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            tools: getTools(),
          },
          id,
        });
      }

      case "tools/call": {
        const { name, arguments: args } = params as {
          name: string;
          arguments?: Record<string, unknown>;
        };

        // Pass the token through for Convex authentication
        const result = await handleToolCall(name, args ?? {}, authResult.token);

        return NextResponse.json({
          jsonrpc: "2.0",
          result,
          id,
        });
      }

      default: {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        });
      }
    }
  } catch (error) {
    console.error("[MCP] Error handling request:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
      },
      id,
    });
  }
}

/**
 * GET handler for health check / discovery
 */
export async function GET() {
  return NextResponse.json({
    name: "credit-cards-mcp",
    version: "1.0.0",
    description: "MCP server for querying credit card data",
    tools: getTools().map((t) => t.name),
  });
}
