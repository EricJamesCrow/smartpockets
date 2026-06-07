import { describe, expect, it } from "vitest";
import { entitlementsFor, resolvePlan } from "../billing/entitlements";

describe("entitlementsFor", () => {
  it("free is strictly smaller than pro on every axis", () => {
    const free = entitlementsFor("free");
    const pro = entitlementsFor("pro");
    expect(free.chatMessagesPerMonth).toBeLessThan(pro.chatMessagesPerMonth);
    expect(free.chatTokensPerMonth).toBeLessThan(pro.chatTokensPerMonth);
    expect(free.maxPlaidConnections).toBeLessThan(pro.maxPlaidConnections);
  });

  it("free defaults match the spec (15 msgs, 1 connection)", () => {
    const free = entitlementsFor("free");
    expect(free.chatMessagesPerMonth).toBe(15);
    expect(free.maxPlaidConnections).toBe(1);
  });

  it("pro defaults match the spec (500 msgs, 5 connections)", () => {
    const pro = entitlementsFor("pro");
    expect(pro.chatMessagesPerMonth).toBe(500);
    expect(pro.maxPlaidConnections).toBe(5);
  });
});

describe("resolvePlan", () => {
  it("normalizes a known plan", () => {
    expect(resolvePlan("pro")).toBe("pro");
    expect(resolvePlan("free")).toBe("free");
  });
  it("fails safe to free on unknown/missing", () => {
    expect(resolvePlan(undefined)).toBe("free");
    expect(resolvePlan(null)).toBe("free");
    expect(resolvePlan("enterprise")).toBe("free");
    expect(resolvePlan("")).toBe("free");
  });
});
