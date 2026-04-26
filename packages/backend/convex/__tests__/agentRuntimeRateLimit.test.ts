import { describe, expect, it } from "vitest";
import { shouldFailClosedOnRateLimitError } from "../agent/runtime";

describe("agent runtime rate-limit failure policy", () => {
    it("fails closed for all write buckets", () => {
        expect(shouldFailClosedOnRateLimitError("write_single")).toBe(true);
        expect(shouldFailClosedOnRateLimitError("write_bulk")).toBe(true);
        expect(shouldFailClosedOnRateLimitError("write_expensive")).toBe(true);
    });

    it("does not fail closed for read buckets", () => {
        expect(shouldFailClosedOnRateLimitError("read_cheap")).toBe(false);
        expect(shouldFailClosedOnRateLimitError("read_moderate")).toBe(false);
    });
});
