import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config";
import plaid from "@crowdevelopment/convex-plaid/convex.config";
import agent from "@convex-dev/agent/convex.config";
import rag from "@convex-dev/rag/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();
app.use(resend);
app.use(plaid);
app.use(agent);
app.use(rag);
app.use(workflow);
app.use(rateLimiter);

export default app;
