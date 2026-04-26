import { v } from "convex/values";
import { agentQuery } from "../../functions";

// Stub until W4's getPlaidItemHealth / listPlaidItemHealth publish
// (contracts §5.4). W2.11 wires to the real query once available.
export const getPlaidHealth = agentQuery({
    args: {},
    returns: v.any(),
    handler: async () => ({
        ids: [],
        preview: {
            items: [],
            live: true,
            capturedAt: new Date().toISOString(),
        },
        window: undefined,
    }),
});
