// OAuth 2.0 Authorization Server Metadata (RFC 8414), proxied from the Clerk
// instance so MCP clients that resolve the authorization server at this
// origin (instead of following the protected-resource metadata) still work.
import { authServerMetadataHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

const handler = authServerMetadataHandlerClerk();
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
