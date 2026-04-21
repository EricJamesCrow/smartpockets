import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    typecheck: {
      tsconfig: "./tsconfig.json",
    },
    include: ["convex/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
