import { describe, expect, it } from "vitest";
import {
  mapAccountTypeForEnrich,
  pickEnrichDescription,
  inferEnrichDirection,
} from "../plaidComponent.helpers";

describe("mapAccountTypeForEnrich", () => {
  it("maps credit accounts to credit", () => {
    expect(mapAccountTypeForEnrich("credit")).toBe("credit");
  });

  it("maps depository accounts to depository", () => {
    expect(mapAccountTypeForEnrich("depository")).toBe("depository");
  });

  it("returns undefined for loan / investment / other (Plaid Enrich rejects them)", () => {
    expect(mapAccountTypeForEnrich("loan")).toBeUndefined();
    expect(mapAccountTypeForEnrich("investment")).toBeUndefined();
    expect(mapAccountTypeForEnrich("other")).toBeUndefined();
  });

  it("returns undefined for unknown / missing types", () => {
    expect(mapAccountTypeForEnrich(undefined)).toBeUndefined();
    expect(mapAccountTypeForEnrich(null as unknown as string)).toBeUndefined();
    expect(mapAccountTypeForEnrich("")).toBeUndefined();
    expect(mapAccountTypeForEnrich("brokerage")).toBeUndefined();
  });
});

describe("pickEnrichDescription", () => {
  it("prefers originalDescription when present", () => {
    expect(
      pickEnrichDescription({
        originalDescription: "AMAZON MKTPL*B90VX7M20",
        name: "Amazon",
        merchantName: "Amazon",
      })
    ).toBe("AMAZON MKTPL*B90VX7M20");
  });

  it("falls back to name when originalDescription is missing", () => {
    expect(
      pickEnrichDescription({
        name: "PURCHASE WM SUPERCENTER #1700",
        merchantName: "Walmart",
      })
    ).toBe("PURCHASE WM SUPERCENTER #1700");
  });

  it("falls back to merchantName when both originalDescription and name are missing", () => {
    expect(
      pickEnrichDescription({
        merchantName: "Walmart",
      })
    ).toBe("Walmart");
  });

  it("returns undefined when nothing is available", () => {
    expect(pickEnrichDescription({})).toBeUndefined();
  });

  it("ignores empty strings", () => {
    expect(
      pickEnrichDescription({
        originalDescription: "",
        name: "Amazon",
      })
    ).toBe("Amazon");
  });
});

describe("inferEnrichDirection", () => {
  it("treats positive milliunits (purchases) as OUTFLOW", () => {
    expect(inferEnrichDirection(12_340)).toBe("OUTFLOW");
    expect(inferEnrichDirection(1)).toBe("OUTFLOW");
  });

  it("treats negative milliunits (refunds, deposits) as INFLOW", () => {
    expect(inferEnrichDirection(-12_340)).toBe("INFLOW");
    expect(inferEnrichDirection(-1)).toBe("INFLOW");
  });

  it("treats zero as OUTFLOW (matches Plaid's default for ambiguous flows)", () => {
    expect(inferEnrichDirection(0)).toBe("OUTFLOW");
  });
});
