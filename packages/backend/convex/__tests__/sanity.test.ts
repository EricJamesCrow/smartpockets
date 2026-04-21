import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("convex-test harness", () => {
  it("boots with the host-app schema", async () => {
    const t = convexTest(schema, modules);
    expect(t).toBeDefined();
  });
});
