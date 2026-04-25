// W6 schema-pin snapshot. CI fails if a W4-owned (convex-plaid) field W6
// reads is renamed or removed. Update only when W6 has explicitly accepted
// the W4 schema change in a coordinated PR.
//
// Approach: asserts substring presence in the convex-plaid component schema
// source file. Fragile to formatting changes but robust against renames and
// enum drift, which is what we care about.

export const W4_FIELDS_W6_READS = {
    plaidTransactions: {
        fields: [
            "transactionId",
            "accountId",
            "amount",
            "date",
            "name",
            "merchantName",
            "pending",
            "categoryPrimary",
            "categoryDetailed",
            "merchantId",
        ],
        // NOTE: categoryPrimary is stored as a free-form string in W4 (Plaid's
        // PFC taxonomy is open-ended), so we cannot pin enum values at the
        // schema level. W6 anomaly/subscription scans hard-code the exclude
        // list ("LOAN_PAYMENTS", "RENT_AND_UTILITIES", "TRANSFER_IN",
        // "TRANSFER_OUT") in code; those literals are covered by unit tests.
    },
    plaidRecurringStreams: {
        fields: [
            "streamId",
            "accountId",
            "merchantName",
            "averageAmount",
            "lastAmount",
            "frequency",
            "firstDate",
            "lastDate",
            "predictedNextDate",
            "status",
            "type",
            "isActive",
        ],
        enumPin: {
            status: ["MATURE", "EARLY_DETECTION", "TOMBSTONED"],
            type: ["inflow", "outflow"],
        },
    },
    plaidAccounts: {
        fields: ["userId", "type", "subtype"],
        enumPin: {
            type: ["depository"],
        },
        nested: {
            balances: ["current", "isoCurrencyCode"],
        },
    },
    plaidCreditCardLiabilities: {
        fields: [
            "nextPaymentDueDate",
            "minimumPaymentAmount",
            "lastStatementBalance",
        ],
    },
} as const;
