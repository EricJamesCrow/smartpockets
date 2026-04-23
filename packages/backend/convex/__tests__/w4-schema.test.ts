import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { W4_FIELDS_W6_READS } from "./snapshots/w4-schema.snap";

// Resolve from this test file up to the monorepo root, then into convex-plaid.
// __dirname is not available in ESM mode; use import.meta.url.
const schemaPath = resolve(
    new URL(".", import.meta.url).pathname,
    "../../../../packages/convex-plaid/src/component/schema.ts",
);

const schemaSource = readFileSync(schemaPath, "utf8");

describe("W4 schema pin (W6 contract)", () => {
    for (const [tableName, expectations] of Object.entries(W4_FIELDS_W6_READS)) {
        describe(tableName, () => {
            it("is defined in the convex-plaid component schema", () => {
                expect(schemaSource).toContain(`${tableName}: defineTable`);
            });

            for (const fieldName of expectations.fields) {
                it(`retains field "${fieldName}"`, () => {
                    expect(schemaSource).toMatch(
                        new RegExp(`\\b${fieldName}\\s*:`),
                    );
                });
            }

            if ("enumPin" in expectations && expectations.enumPin) {
                for (const [enumField, expectedValues] of Object.entries(
                    expectations.enumPin,
                )) {
                    for (const value of expectedValues as readonly string[]) {
                        it(`${enumField} enum retains "${value}"`, () => {
                            expect(schemaSource).toContain(`"${value}"`);
                        });
                    }
                }
            }

            if ("nested" in expectations && expectations.nested) {
                for (const [parentField, childFields] of Object.entries(
                    expectations.nested,
                )) {
                    for (const child of childFields as readonly string[]) {
                        it(`${parentField} retains nested "${child}"`, () => {
                            expect(schemaSource).toContain(parentField);
                            expect(schemaSource).toMatch(
                                new RegExp(`\\b${child}\\s*:`),
                            );
                        });
                    }
                }
            }
        });
    }
});
