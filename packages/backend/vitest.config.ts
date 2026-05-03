import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    typecheck: {
      tsconfig: "./tsconfig.json",
    },
    // Match any `__tests__` directory under `convex/`, not only the
    // top-level one. Without the leading `**/`, files like
    // `convex/notifications/__tests__/hashing.test.ts` and
    // `convex/email/__tests__/unsubscribeToken.test.ts` would be
    // silently uncovered.
    include: ["convex/**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
