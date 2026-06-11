// OAuth 2.0 Protected Resource Metadata (RFC 9728) for the MCP server at
// /api/mcp. MCP clients discover the authorization server (Clerk) from here
// after receiving a 401 with WWW-Authenticate from the MCP route.
import { metadataCorsOptionsRequestHandler, protectedResourceHandlerClerk } from "@clerk/mcp-tools/next";

const handler = protectedResourceHandlerClerk({
    scopes_supported: ["profile", "email"],
});
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
