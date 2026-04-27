import { v } from "convex/values";
import { agentQuery } from "../../functions";
import { installmentPreviewForModel } from "./moneyPreview";

export const listInstallmentPlans = agentQuery({
    args: { includeInactive: v.optional(v.boolean()) },
    returns: v.any(),
    handler: async (ctx, { includeInactive }) => {
        const viewer = ctx.viewerX();
        const plans = await viewer.edge("installmentPlans");
        const filtered = includeInactive ? plans : plans.filter((p: { isActive: boolean }) => p.isActive);
        return {
            ids: filtered.map((p: { _id: string }) => p._id),
            preview: {
                plans: filtered.map(installmentPreviewForModel),
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: undefined,
        };
    },
});
