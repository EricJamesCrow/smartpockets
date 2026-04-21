import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body reads promoRates directly. Switches to promoCountdowns
// in W6 follow-up (contracts §17).
export const listDeferredInterestPromos = agentQuery({
  args: { userId: v.id("users"), includeExpired: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async () => ({
    ids: [],
    preview: {
      promos: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
