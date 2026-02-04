const clerkDomain =
  process.env.CLERK_FRONTEND_API_URL ??
  process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL;

if (!clerkDomain) {
  throw new Error("Missing Clerk domain. Set CLERK_FRONTEND_API_URL (or NEXT_PUBLIC_CLERK_FRONTEND_API_URL).");
}

export default {
  providers: [
    {
      domain: clerkDomain,
      applicationID: "convex",
    },
  ],
};
