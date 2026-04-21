import { v } from "convex/values";
import { agentQuery } from "../../functions";

/**
 * Reads promoRates directly at MVP. Switches to W6's promoCountdowns
 * denormalised table in a follow-up per contracts §17.
 */
export const listDeferredInterestPromos = agentQuery({
  args: { includeExpired: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, { includeExpired }) => {
    const viewer = ctx.viewerX();
    const promos = (await viewer.edge("promoRates")) as unknown as Array<
      Record<string, unknown> & {
        _id: string;
        isActive: boolean;
        expirationDate: string;
      }
    >;
    const today = new Date().toISOString().slice(0, 10);
    const active = includeExpired
      ? promos
      : promos.filter((p) => p.isActive && p.expirationDate >= today);
    const withCountdown = active.map((p) => {
      const daysToExpiration = Math.max(
        0,
        Math.ceil(
          (new Date(p.expirationDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      return { ...p, daysToExpiration };
    });
    return {
      ids: withCountdown.map((p) => p._id),
      preview: {
        promos: withCountdown,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});
