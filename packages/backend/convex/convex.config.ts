import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config";
import plaid from "@crowdevelopment/convex-plaid/convex.config";

const app = defineApp();
app.use(resend);
app.use(plaid);

export default app;
