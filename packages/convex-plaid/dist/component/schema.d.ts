/**
 * Plaid Component Schema
 *
 * Tables for storing Plaid integration data.
 * All monetary values stored as MILLIUNITS (amount × 1000) to avoid float precision errors.
 *
 * IMPORTANT: Component boundaries require string IDs, not v.id() types.
 * - userId: string (passed from host app, not from ctx.auth)
 * - plaidItemId: string (Convex document ID as string for crossing component boundary)
 */
declare const _default: import("convex/server").SchemaDefinition<{
    /**
     * Plaid Items - Connection metadata for each linked bank/institution
     *
     * Each plaidItem represents one Plaid Link connection.
     * Access tokens are encrypted using JWE (A256GCM) before storage.
     */
    plaidItems: import("convex/server").TableDefinition<import("convex/values").VObject<{
        cursor?: string | undefined;
        institutionId?: string | undefined;
        institutionName?: string | undefined;
        isActive?: boolean | undefined;
        syncError?: string | undefined;
        lastSyncedAt?: number | undefined;
        activatedAt?: number | undefined;
        errorCode?: string | undefined;
        errorMessage?: string | undefined;
        errorAt?: number | undefined;
        reauthReason?: string | undefined;
        reauthAt?: number | undefined;
        disconnectedReason?: string | undefined;
        disconnectedAt?: number | undefined;
        syncVersion?: number | undefined;
        syncStartedAt?: number | undefined;
        circuitState?: "closed" | "open" | "half_open" | undefined;
        consecutiveFailures?: number | undefined;
        consecutiveSuccesses?: number | undefined;
        lastFailureAt?: number | undefined;
        nextRetryAt?: number | undefined;
        newAccountsAvailableAt?: number | undefined;
        firstErrorAt?: number | undefined;
        lastDispatchedAt?: number | undefined;
        userId: string;
        itemId: string;
        accessToken: string;
        products: string[];
        status: "pending" | "syncing" | "active" | "error" | "needs_reauth" | "deleting";
        createdAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itemId: import("convex/values").VString<string, "required">;
        accessToken: import("convex/values").VString<string, "required">;
        cursor: import("convex/values").VString<string | undefined, "optional">;
        institutionId: import("convex/values").VString<string | undefined, "optional">;
        institutionName: import("convex/values").VString<string | undefined, "optional">;
        products: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        isActive: import("convex/values").VBoolean<boolean | undefined, "optional">;
        status: import("convex/values").VUnion<"pending" | "syncing" | "active" | "error" | "needs_reauth" | "deleting", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"syncing", "required">, import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"error", "required">, import("convex/values").VLiteral<"needs_reauth", "required">, import("convex/values").VLiteral<"deleting", "required">], "required", never>;
        syncError: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        activatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        errorCode: import("convex/values").VString<string | undefined, "optional">;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        errorAt: import("convex/values").VFloat64<number | undefined, "optional">;
        reauthReason: import("convex/values").VString<string | undefined, "optional">;
        reauthAt: import("convex/values").VFloat64<number | undefined, "optional">;
        disconnectedReason: import("convex/values").VString<string | undefined, "optional">;
        disconnectedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        syncVersion: import("convex/values").VFloat64<number | undefined, "optional">;
        syncStartedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        circuitState: import("convex/values").VUnion<"closed" | "open" | "half_open" | undefined, [import("convex/values").VLiteral<"closed", "required">, import("convex/values").VLiteral<"open", "required">, import("convex/values").VLiteral<"half_open", "required">], "optional", never>;
        consecutiveFailures: import("convex/values").VFloat64<number | undefined, "optional">;
        consecutiveSuccesses: import("convex/values").VFloat64<number | undefined, "optional">;
        lastFailureAt: import("convex/values").VFloat64<number | undefined, "optional">;
        nextRetryAt: import("convex/values").VFloat64<number | undefined, "optional">;
        newAccountsAvailableAt: import("convex/values").VFloat64<number | undefined, "optional">;
        firstErrorAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastDispatchedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "userId" | "itemId" | "accessToken" | "cursor" | "institutionId" | "institutionName" | "products" | "isActive" | "status" | "syncError" | "createdAt" | "lastSyncedAt" | "activatedAt" | "errorCode" | "errorMessage" | "errorAt" | "reauthReason" | "reauthAt" | "disconnectedReason" | "disconnectedAt" | "syncVersion" | "syncStartedAt" | "circuitState" | "consecutiveFailures" | "consecutiveSuccesses" | "lastFailureAt" | "nextRetryAt" | "newAccountsAvailableAt" | "firstErrorAt" | "lastDispatchedAt">, {
        by_user: ["userId", "_creationTime"];
        by_item_id: ["itemId", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    /**
     * Plaid Accounts - Bank/credit accounts from Plaid API
     *
     * Each account belongs to a plaidItem.
     * Balances stored in MILLIUNITS (amount × 1000).
     */
    plaidAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        officialName?: string | undefined;
        mask?: string | undefined;
        subtype?: string | undefined;
        userId: string;
        type: string;
        createdAt: number;
        plaidItemId: string;
        accountId: string;
        name: string;
        balances: {
            available?: number | undefined;
            current?: number | undefined;
            limit?: number | undefined;
            isoCurrencyCode: string;
        };
    }, {
        userId: import("convex/values").VString<string, "required">;
        plaidItemId: import("convex/values").VString<string, "required">;
        accountId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        officialName: import("convex/values").VString<string | undefined, "optional">;
        mask: import("convex/values").VString<string | undefined, "optional">;
        type: import("convex/values").VString<string, "required">;
        subtype: import("convex/values").VString<string | undefined, "optional">;
        balances: import("convex/values").VObject<{
            available?: number | undefined;
            current?: number | undefined;
            limit?: number | undefined;
            isoCurrencyCode: string;
        }, {
            available: import("convex/values").VFloat64<number | undefined, "optional">;
            current: import("convex/values").VFloat64<number | undefined, "optional">;
            limit: import("convex/values").VFloat64<number | undefined, "optional">;
            isoCurrencyCode: import("convex/values").VString<string, "required">;
        }, "required", "available" | "current" | "limit" | "isoCurrencyCode">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "type" | "createdAt" | "plaidItemId" | "accountId" | "name" | "officialName" | "mask" | "subtype" | "balances" | "balances.available" | "balances.current" | "balances.limit" | "balances.isoCurrencyCode">, {
        by_plaid_item: ["plaidItemId", "_creationTime"];
        by_account_id: ["accountId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    /**
     * Plaid Transactions - Transaction history from Plaid API
     *
     * Uses cursor-based /transactions/sync for incremental updates.
     * Amounts stored in MILLIUNITS (amount × 1000).
     */
    plaidTransactions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        datetime?: string | undefined;
        merchantName?: string | undefined;
        pendingTransactionId?: string | undefined;
        categoryPrimary?: string | undefined;
        categoryDetailed?: string | undefined;
        paymentChannel?: string | undefined;
        merchantId?: string | undefined;
        enrichmentData?: {
            counterpartyName?: string | undefined;
            counterpartyType?: string | undefined;
            counterpartyEntityId?: string | undefined;
            counterpartyConfidence?: string | undefined;
            counterpartyLogoUrl?: string | undefined;
            counterpartyWebsite?: string | undefined;
            counterpartyPhoneNumber?: string | undefined;
            enrichedAt?: number | undefined;
        } | undefined;
        updatedAt?: number | undefined;
        userId: string;
        pending: boolean;
        createdAt: number;
        plaidItemId: string;
        accountId: string;
        name: string;
        isoCurrencyCode: string;
        transactionId: string;
        amount: number;
        date: string;
    }, {
        userId: import("convex/values").VString<string, "required">;
        plaidItemId: import("convex/values").VString<string, "required">;
        accountId: import("convex/values").VString<string, "required">;
        transactionId: import("convex/values").VString<string, "required">;
        amount: import("convex/values").VFloat64<number, "required">;
        isoCurrencyCode: import("convex/values").VString<string, "required">;
        date: import("convex/values").VString<string, "required">;
        datetime: import("convex/values").VString<string | undefined, "optional">;
        name: import("convex/values").VString<string, "required">;
        merchantName: import("convex/values").VString<string | undefined, "optional">;
        pending: import("convex/values").VBoolean<boolean, "required">;
        pendingTransactionId: import("convex/values").VString<string | undefined, "optional">;
        categoryPrimary: import("convex/values").VString<string | undefined, "optional">;
        categoryDetailed: import("convex/values").VString<string | undefined, "optional">;
        paymentChannel: import("convex/values").VString<string | undefined, "optional">;
        merchantId: import("convex/values").VString<string | undefined, "optional">;
        enrichmentData: import("convex/values").VObject<{
            counterpartyName?: string | undefined;
            counterpartyType?: string | undefined;
            counterpartyEntityId?: string | undefined;
            counterpartyConfidence?: string | undefined;
            counterpartyLogoUrl?: string | undefined;
            counterpartyWebsite?: string | undefined;
            counterpartyPhoneNumber?: string | undefined;
            enrichedAt?: number | undefined;
        } | undefined, {
            counterpartyName: import("convex/values").VString<string | undefined, "optional">;
            counterpartyType: import("convex/values").VString<string | undefined, "optional">;
            counterpartyEntityId: import("convex/values").VString<string | undefined, "optional">;
            counterpartyConfidence: import("convex/values").VString<string | undefined, "optional">;
            counterpartyLogoUrl: import("convex/values").VString<string | undefined, "optional">;
            counterpartyWebsite: import("convex/values").VString<string | undefined, "optional">;
            counterpartyPhoneNumber: import("convex/values").VString<string | undefined, "optional">;
            enrichedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "counterpartyName" | "counterpartyType" | "counterpartyEntityId" | "counterpartyConfidence" | "counterpartyLogoUrl" | "counterpartyWebsite" | "counterpartyPhoneNumber" | "enrichedAt">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "userId" | "pending" | "createdAt" | "plaidItemId" | "accountId" | "name" | "isoCurrencyCode" | "transactionId" | "amount" | "date" | "datetime" | "merchantName" | "pendingTransactionId" | "categoryPrimary" | "categoryDetailed" | "paymentChannel" | "merchantId" | "enrichmentData" | "updatedAt" | "enrichmentData.counterpartyName" | "enrichmentData.counterpartyType" | "enrichmentData.counterpartyEntityId" | "enrichmentData.counterpartyConfidence" | "enrichmentData.counterpartyLogoUrl" | "enrichmentData.counterpartyWebsite" | "enrichmentData.counterpartyPhoneNumber" | "enrichmentData.enrichedAt">, {
        by_account: ["accountId", "_creationTime"];
        by_account_date: ["accountId", "date", "_creationTime"];
        by_transaction_id: ["transactionId", "_creationTime"];
        by_date: ["userId", "date", "_creationTime"];
        by_plaid_item: ["plaidItemId", "_creationTime"];
        by_merchant: ["merchantId", "_creationTime"];
    }, {}, {}>;
    /**
     * Plaid Credit Card Liabilities - APRs, payment info, due dates
     *
     * From Plaid /liabilities/get API (credit card product).
     * One record per credit card account.
     * All monetary values in MILLIUNITS.
     */
    plaidCreditCardLiabilities: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastPaymentAmount?: number | undefined;
        lastPaymentDate?: string | undefined;
        lastStatementBalance?: number | undefined;
        lastStatementIssueDate?: string | undefined;
        minimumPaymentAmount?: number | undefined;
        nextPaymentDueDate?: string | undefined;
        userId: string;
        createdAt: number;
        plaidItemId: string;
        accountId: string;
        updatedAt: number;
        aprs: {
            balanceSubjectToApr?: number | undefined;
            interestChargeAmount?: number | undefined;
            aprPercentage: number;
            aprType: string;
        }[];
        isOverdue: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        plaidItemId: import("convex/values").VString<string, "required">;
        accountId: import("convex/values").VString<string, "required">;
        aprs: import("convex/values").VArray<{
            balanceSubjectToApr?: number | undefined;
            interestChargeAmount?: number | undefined;
            aprPercentage: number;
            aprType: string;
        }[], import("convex/values").VObject<{
            balanceSubjectToApr?: number | undefined;
            interestChargeAmount?: number | undefined;
            aprPercentage: number;
            aprType: string;
        }, {
            aprPercentage: import("convex/values").VFloat64<number, "required">;
            aprType: import("convex/values").VString<string, "required">;
            balanceSubjectToApr: import("convex/values").VFloat64<number | undefined, "optional">;
            interestChargeAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "required", "aprPercentage" | "aprType" | "balanceSubjectToApr" | "interestChargeAmount">, "required">;
        isOverdue: import("convex/values").VBoolean<boolean, "required">;
        lastPaymentAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        lastPaymentDate: import("convex/values").VString<string | undefined, "optional">;
        lastStatementBalance: import("convex/values").VFloat64<number | undefined, "optional">;
        lastStatementIssueDate: import("convex/values").VString<string | undefined, "optional">;
        minimumPaymentAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        nextPaymentDueDate: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "plaidItemId" | "accountId" | "updatedAt" | "aprs" | "isOverdue" | "lastPaymentAmount" | "lastPaymentDate" | "lastStatementBalance" | "lastStatementIssueDate" | "minimumPaymentAmount" | "nextPaymentDueDate">, {
        by_account: ["accountId", "_creationTime"];
        by_plaid_item: ["plaidItemId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    /**
     * Plaid Recurring Streams - Detected recurring transactions
     *
     * From Plaid /transactions/recurring/get API.
     * Identifies subscriptions, regular bills, and recurring income.
     * All monetary values in MILLIUNITS.
     */
    plaidRecurringStreams: import("convex/server").TableDefinition<import("convex/values").VObject<{
        merchantName?: string | undefined;
        category?: string | undefined;
        firstDate?: string | undefined;
        lastDate?: string | undefined;
        predictedNextDate?: string | undefined;
        userId: string;
        type: "inflow" | "outflow";
        isActive: boolean;
        status: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
        createdAt: number;
        plaidItemId: string;
        accountId: string;
        isoCurrencyCode: string;
        updatedAt: number;
        streamId: string;
        description: string;
        averageAmount: number;
        lastAmount: number;
        frequency: string;
    }, {
        userId: import("convex/values").VString<string, "required">;
        plaidItemId: import("convex/values").VString<string, "required">;
        streamId: import("convex/values").VString<string, "required">;
        accountId: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        merchantName: import("convex/values").VString<string | undefined, "optional">;
        averageAmount: import("convex/values").VFloat64<number, "required">;
        lastAmount: import("convex/values").VFloat64<number, "required">;
        isoCurrencyCode: import("convex/values").VString<string, "required">;
        frequency: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"MATURE" | "EARLY_DETECTION" | "TOMBSTONED", [import("convex/values").VLiteral<"MATURE", "required">, import("convex/values").VLiteral<"EARLY_DETECTION", "required">, import("convex/values").VLiteral<"TOMBSTONED", "required">], "required", never>;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        type: import("convex/values").VUnion<"inflow" | "outflow", [import("convex/values").VLiteral<"inflow", "required">, import("convex/values").VLiteral<"outflow", "required">], "required", never>;
        category: import("convex/values").VString<string | undefined, "optional">;
        firstDate: import("convex/values").VString<string | undefined, "optional">;
        lastDate: import("convex/values").VString<string | undefined, "optional">;
        predictedNextDate: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "type" | "isActive" | "status" | "createdAt" | "plaidItemId" | "accountId" | "isoCurrencyCode" | "merchantName" | "updatedAt" | "streamId" | "description" | "averageAmount" | "lastAmount" | "frequency" | "category" | "firstDate" | "lastDate" | "predictedNextDate">, {
        by_user: ["userId", "_creationTime"];
        by_stream_id: ["streamId", "_creationTime"];
        by_plaid_item: ["plaidItemId", "_creationTime"];
        by_status: ["userId", "status", "isActive", "_creationTime"];
    }, {}, {}>;
    /**
     * Plaid Mortgage Liabilities - Mortgage loan details
     *
     * From Plaid /liabilities/get API (mortgage product).
     * All monetary values in MILLIUNITS.
     */
    plaidMortgageLiabilities: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastPaymentAmount?: number | undefined;
        lastPaymentDate?: string | undefined;
        nextPaymentDueDate?: string | undefined;
        accountNumber?: string | undefined;
        loanTerm?: string | undefined;
        loanTypeDescription?: string | undefined;
        originationDate?: string | undefined;
        maturityDate?: string | undefined;
        interestRateType?: string | undefined;
        nextMonthlyPayment?: number | undefined;
        originationPrincipalAmount?: number | undefined;
        currentLateFee?: number | undefined;
        escrowBalance?: number | undefined;
        pastDueAmount?: number | undefined;
        ytdInterestPaid?: number | undefined;
        ytdPrincipalPaid?: number | undefined;
        hasPmi?: boolean | undefined;
        hasPrepaymentPenalty?: boolean | undefined;
        propertyAddress?: {
            street?: string | undefined;
            city?: string | undefined;
            region?: string | undefined;
            postalCode?: string | undefined;
            country?: string | undefined;
        } | undefined;
        userId: string;
        createdAt: number;
        plaidItemId: string;
        accountId: string;
        updatedAt: number;
        interestRatePercentage: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        plaidItemId: import("convex/values").VString<string, "required">;
        accountId: import("convex/values").VString<string, "required">;
        accountNumber: import("convex/values").VString<string | undefined, "optional">;
        loanTerm: import("convex/values").VString<string | undefined, "optional">;
        loanTypeDescription: import("convex/values").VString<string | undefined, "optional">;
        originationDate: import("convex/values").VString<string | undefined, "optional">;
        maturityDate: import("convex/values").VString<string | undefined, "optional">;
        interestRatePercentage: import("convex/values").VFloat64<number, "required">;
        interestRateType: import("convex/values").VString<string | undefined, "optional">;
        lastPaymentAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        lastPaymentDate: import("convex/values").VString<string | undefined, "optional">;
        nextMonthlyPayment: import("convex/values").VFloat64<number | undefined, "optional">;
        nextPaymentDueDate: import("convex/values").VString<string | undefined, "optional">;
        originationPrincipalAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        currentLateFee: import("convex/values").VFloat64<number | undefined, "optional">;
        escrowBalance: import("convex/values").VFloat64<number | undefined, "optional">;
        pastDueAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        ytdInterestPaid: import("convex/values").VFloat64<number | undefined, "optional">;
        ytdPrincipalPaid: import("convex/values").VFloat64<number | undefined, "optional">;
        hasPmi: import("convex/values").VBoolean<boolean | undefined, "optional">;
        hasPrepaymentPenalty: import("convex/values").VBoolean<boolean | undefined, "optional">;
        propertyAddress: import("convex/values").VObject<{
            street?: string | undefined;
            city?: string | undefined;
            region?: string | undefined;
            postalCode?: string | undefined;
            country?: string | undefined;
        } | undefined, {
            street: import("convex/values").VString<string | undefined, "optional">;
            city: import("convex/values").VString<string | undefined, "optional">;
            region: import("convex/values").VString<string | undefined, "optional">;
            postalCode: import("convex/values").VString<string | undefined, "optional">;
            country: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "street" | "city" | "region" | "postalCode" | "country">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "plaidItemId" | "accountId" | "updatedAt" | "lastPaymentAmount" | "lastPaymentDate" | "nextPaymentDueDate" | "accountNumber" | "loanTerm" | "loanTypeDescription" | "originationDate" | "maturityDate" | "interestRatePercentage" | "interestRateType" | "nextMonthlyPayment" | "originationPrincipalAmount" | "currentLateFee" | "escrowBalance" | "pastDueAmount" | "ytdInterestPaid" | "ytdPrincipalPaid" | "hasPmi" | "hasPrepaymentPenalty" | "propertyAddress" | "propertyAddress.street" | "propertyAddress.city" | "propertyAddress.region" | "propertyAddress.postalCode" | "propertyAddress.country">, {
        by_user: ["userId", "_creationTime"];
        by_account: ["accountId", "_creationTime"];
        by_plaid_item: ["plaidItemId", "_creationTime"];
    }, {}, {}>;
    /**
     * Plaid Student Loan Liabilities - Student loan details
     *
     * From Plaid /liabilities/get API (student loan product).
     * All monetary values in MILLIUNITS.
     */
    plaidStudentLoanLiabilities: import("convex/server").TableDefinition<import("convex/values").VObject<{
        isOverdue?: boolean | undefined;
        lastPaymentAmount?: number | undefined;
        lastPaymentDate?: string | undefined;
        lastStatementBalance?: number | undefined;
        lastStatementIssueDate?: string | undefined;
        minimumPaymentAmount?: number | undefined;
        nextPaymentDueDate?: string | undefined;
        accountNumber?: string | undefined;
        originationDate?: string | undefined;
        originationPrincipalAmount?: number | undefined;
        ytdInterestPaid?: number | undefined;
        ytdPrincipalPaid?: number | undefined;
        loanName?: string | undefined;
        guarantor?: string | undefined;
        sequenceNumber?: string | undefined;
        disbursementDates?: string[] | undefined;
        expectedPayoffDate?: string | undefined;
        paymentReferenceNumber?: string | undefined;
        outstandingInterestAmount?: number | undefined;
        loanStatus?: {
            type?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
        repaymentPlan?: {
            type?: string | undefined;
            description?: string | undefined;
        } | undefined;
        servicerAddress?: {
            street?: string | undefined;
            city?: string | undefined;
            region?: string | undefined;
            postalCode?: string | undefined;
            country?: string | undefined;
        } | undefined;
        userId: string;
        createdAt: number;
        plaidItemId: string;
        accountId: string;
        updatedAt: number;
        interestRatePercentage: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        plaidItemId: import("convex/values").VString<string, "required">;
        accountId: import("convex/values").VString<string, "required">;
        accountNumber: import("convex/values").VString<string | undefined, "optional">;
        loanName: import("convex/values").VString<string | undefined, "optional">;
        guarantor: import("convex/values").VString<string | undefined, "optional">;
        sequenceNumber: import("convex/values").VString<string | undefined, "optional">;
        disbursementDates: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        originationDate: import("convex/values").VString<string | undefined, "optional">;
        expectedPayoffDate: import("convex/values").VString<string | undefined, "optional">;
        lastStatementIssueDate: import("convex/values").VString<string | undefined, "optional">;
        interestRatePercentage: import("convex/values").VFloat64<number, "required">;
        lastPaymentAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        lastPaymentDate: import("convex/values").VString<string | undefined, "optional">;
        minimumPaymentAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        nextPaymentDueDate: import("convex/values").VString<string | undefined, "optional">;
        paymentReferenceNumber: import("convex/values").VString<string | undefined, "optional">;
        originationPrincipalAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        outstandingInterestAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        lastStatementBalance: import("convex/values").VFloat64<number | undefined, "optional">;
        ytdInterestPaid: import("convex/values").VFloat64<number | undefined, "optional">;
        ytdPrincipalPaid: import("convex/values").VFloat64<number | undefined, "optional">;
        isOverdue: import("convex/values").VBoolean<boolean | undefined, "optional">;
        loanStatus: import("convex/values").VObject<{
            type?: string | undefined;
            endDate?: string | undefined;
        } | undefined, {
            type: import("convex/values").VString<string | undefined, "optional">;
            endDate: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "type" | "endDate">;
        repaymentPlan: import("convex/values").VObject<{
            type?: string | undefined;
            description?: string | undefined;
        } | undefined, {
            type: import("convex/values").VString<string | undefined, "optional">;
            description: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "type" | "description">;
        servicerAddress: import("convex/values").VObject<{
            street?: string | undefined;
            city?: string | undefined;
            region?: string | undefined;
            postalCode?: string | undefined;
            country?: string | undefined;
        } | undefined, {
            street: import("convex/values").VString<string | undefined, "optional">;
            city: import("convex/values").VString<string | undefined, "optional">;
            region: import("convex/values").VString<string | undefined, "optional">;
            postalCode: import("convex/values").VString<string | undefined, "optional">;
            country: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "street" | "city" | "region" | "postalCode" | "country">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "plaidItemId" | "accountId" | "updatedAt" | "isOverdue" | "lastPaymentAmount" | "lastPaymentDate" | "lastStatementBalance" | "lastStatementIssueDate" | "minimumPaymentAmount" | "nextPaymentDueDate" | "accountNumber" | "originationDate" | "interestRatePercentage" | "originationPrincipalAmount" | "ytdInterestPaid" | "ytdPrincipalPaid" | "loanName" | "guarantor" | "sequenceNumber" | "disbursementDates" | "expectedPayoffDate" | "paymentReferenceNumber" | "outstandingInterestAmount" | "loanStatus" | "repaymentPlan" | "servicerAddress" | "loanStatus.type" | "loanStatus.endDate" | "repaymentPlan.type" | "repaymentPlan.description" | "servicerAddress.street" | "servicerAddress.city" | "servicerAddress.region" | "servicerAddress.postalCode" | "servicerAddress.country">, {
        by_user: ["userId", "_creationTime"];
        by_account: ["accountId", "_creationTime"];
        by_plaid_item: ["plaidItemId", "_creationTime"];
    }, {}, {}>;
    /**
     * Merchant Enrichments - Cached merchant data from Plaid Enrich API
     *
     * Shared across all users - one record per unique merchant.
     * Used for displaying logos, websites, and merchant details.
     */
    merchantEnrichments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        categoryPrimary?: string | undefined;
        categoryDetailed?: string | undefined;
        logoUrl?: string | undefined;
        categoryIconUrl?: string | undefined;
        website?: string | undefined;
        phoneNumber?: string | undefined;
        merchantName: string;
        merchantId: string;
        confidenceLevel: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
        lastEnriched: number;
    }, {
        merchantId: import("convex/values").VString<string, "required">;
        merchantName: import("convex/values").VString<string, "required">;
        logoUrl: import("convex/values").VString<string | undefined, "optional">;
        categoryPrimary: import("convex/values").VString<string | undefined, "optional">;
        categoryDetailed: import("convex/values").VString<string | undefined, "optional">;
        categoryIconUrl: import("convex/values").VString<string | undefined, "optional">;
        website: import("convex/values").VString<string | undefined, "optional">;
        phoneNumber: import("convex/values").VString<string | undefined, "optional">;
        confidenceLevel: import("convex/values").VUnion<"VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN", [import("convex/values").VLiteral<"VERY_HIGH", "required">, import("convex/values").VLiteral<"HIGH", "required">, import("convex/values").VLiteral<"MEDIUM", "required">, import("convex/values").VLiteral<"LOW", "required">, import("convex/values").VLiteral<"UNKNOWN", "required">], "required", never>;
        lastEnriched: import("convex/values").VFloat64<number, "required">;
    }, "required", "merchantName" | "categoryPrimary" | "categoryDetailed" | "merchantId" | "logoUrl" | "categoryIconUrl" | "website" | "phoneNumber" | "confidenceLevel" | "lastEnriched">, {
        by_merchant: ["merchantId", "_creationTime"];
    }, {}, {}>;
    /**
     * Webhook Logs - Audit trail for Plaid webhooks
     *
     * Used for deduplication (24-hour window) and debugging.
     * Run pruneOldWebhookLogs periodically (e.g., hourly cron) to prevent table growth.
     */
    webhookLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string | undefined;
        processedAt?: number | undefined;
        scheduledFunctionId?: string | undefined;
        itemId: string;
        status: "received" | "processing" | "processed" | "duplicate" | "failed";
        webhookId: string;
        webhookType: string;
        webhookCode: string;
        bodyHash: string;
        receivedAt: number;
    }, {
        webhookId: import("convex/values").VString<string, "required">;
        itemId: import("convex/values").VString<string, "required">;
        webhookType: import("convex/values").VString<string, "required">;
        webhookCode: import("convex/values").VString<string, "required">;
        bodyHash: import("convex/values").VString<string, "required">;
        receivedAt: import("convex/values").VFloat64<number, "required">;
        processedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        status: import("convex/values").VUnion<"received" | "processing" | "processed" | "duplicate" | "failed", [import("convex/values").VLiteral<"received", "required">, import("convex/values").VLiteral<"processing", "required">, import("convex/values").VLiteral<"processed", "required">, import("convex/values").VLiteral<"duplicate", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        scheduledFunctionId: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "itemId" | "status" | "errorMessage" | "webhookId" | "webhookType" | "webhookCode" | "bodyHash" | "receivedAt" | "processedAt" | "scheduledFunctionId">, {
        by_body_hash: ["bodyHash", "_creationTime"];
        by_body_hash_received_at: ["bodyHash", "receivedAt", "_creationTime"];
        by_received_at: ["receivedAt", "_creationTime"];
        by_item: ["itemId", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    /**
     * Sync Logs - Audit trail for sync operations
     *
     * Tracks every sync operation for debugging and monitoring.
     * Use getSyncLogsByItem, getSyncStats queries to analyze sync health.
     * Run pruneOldSyncLogs periodically (e.g., daily cron) to prevent table growth.
     */
    syncLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorCode?: string | undefined;
        errorMessage?: string | undefined;
        completedAt?: number | undefined;
        durationMs?: number | undefined;
        result?: {
            transactionsAdded?: number | undefined;
            transactionsModified?: number | undefined;
            transactionsRemoved?: number | undefined;
            accountsUpdated?: number | undefined;
            streamsUpdated?: number | undefined;
            creditCardsUpdated?: number | undefined;
            mortgagesUpdated?: number | undefined;
            studentLoansUpdated?: number | undefined;
        } | undefined;
        retryCount?: number | undefined;
        userId: string;
        status: "error" | "started" | "success" | "rate_limited" | "circuit_open";
        plaidItemId: string;
        syncType: "transactions" | "liabilities" | "recurring" | "accounts" | "onboard";
        trigger: "onboard" | "webhook" | "scheduled" | "manual";
        startedAt: number;
    }, {
        plaidItemId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VString<string, "required">;
        syncType: import("convex/values").VUnion<"transactions" | "liabilities" | "recurring" | "accounts" | "onboard", [import("convex/values").VLiteral<"transactions", "required">, import("convex/values").VLiteral<"liabilities", "required">, import("convex/values").VLiteral<"recurring", "required">, import("convex/values").VLiteral<"accounts", "required">, import("convex/values").VLiteral<"onboard", "required">], "required", never>;
        trigger: import("convex/values").VUnion<"onboard" | "webhook" | "scheduled" | "manual", [import("convex/values").VLiteral<"webhook", "required">, import("convex/values").VLiteral<"scheduled", "required">, import("convex/values").VLiteral<"manual", "required">, import("convex/values").VLiteral<"onboard", "required">], "required", never>;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        durationMs: import("convex/values").VFloat64<number | undefined, "optional">;
        status: import("convex/values").VUnion<"error" | "started" | "success" | "rate_limited" | "circuit_open", [import("convex/values").VLiteral<"started", "required">, import("convex/values").VLiteral<"success", "required">, import("convex/values").VLiteral<"error", "required">, import("convex/values").VLiteral<"rate_limited", "required">, import("convex/values").VLiteral<"circuit_open", "required">], "required", never>;
        result: import("convex/values").VObject<{
            transactionsAdded?: number | undefined;
            transactionsModified?: number | undefined;
            transactionsRemoved?: number | undefined;
            accountsUpdated?: number | undefined;
            streamsUpdated?: number | undefined;
            creditCardsUpdated?: number | undefined;
            mortgagesUpdated?: number | undefined;
            studentLoansUpdated?: number | undefined;
        } | undefined, {
            transactionsAdded: import("convex/values").VFloat64<number | undefined, "optional">;
            transactionsModified: import("convex/values").VFloat64<number | undefined, "optional">;
            transactionsRemoved: import("convex/values").VFloat64<number | undefined, "optional">;
            accountsUpdated: import("convex/values").VFloat64<number | undefined, "optional">;
            streamsUpdated: import("convex/values").VFloat64<number | undefined, "optional">;
            creditCardsUpdated: import("convex/values").VFloat64<number | undefined, "optional">;
            mortgagesUpdated: import("convex/values").VFloat64<number | undefined, "optional">;
            studentLoansUpdated: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "transactionsAdded" | "transactionsModified" | "transactionsRemoved" | "accountsUpdated" | "streamsUpdated" | "creditCardsUpdated" | "mortgagesUpdated" | "studentLoansUpdated">;
        errorCode: import("convex/values").VString<string | undefined, "optional">;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        retryCount: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "userId" | "status" | "errorCode" | "errorMessage" | "plaidItemId" | "syncType" | "trigger" | "startedAt" | "completedAt" | "durationMs" | "result" | "retryCount" | "result.transactionsAdded" | "result.transactionsModified" | "result.transactionsRemoved" | "result.accountsUpdated" | "result.streamsUpdated" | "result.creditCardsUpdated" | "result.mortgagesUpdated" | "result.studentLoansUpdated">, {
        by_plaid_item: ["plaidItemId", "_creationTime"];
        by_plaid_item_startedAt: ["plaidItemId", "startedAt", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_started_at: ["startedAt", "_creationTime"];
        by_trigger: ["trigger", "_creationTime"];
    }, {}, {}>;
    /**
     * Plaid Institutions - Cached institution metadata
     *
     * Shared cache of bank logos and branding - same Chase logo not duplicated per user.
     * Auto-populated during exchangePublicToken, refreshed if stale (> 24 hours).
     */
    plaidInstitutions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        products?: string[] | undefined;
        logo?: string | undefined;
        primaryColor?: string | undefined;
        url?: string | undefined;
        institutionId: string;
        name: string;
        lastFetched: number;
    }, {
        institutionId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        logo: import("convex/values").VString<string | undefined, "optional">;
        primaryColor: import("convex/values").VString<string | undefined, "optional">;
        url: import("convex/values").VString<string | undefined, "optional">;
        products: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        lastFetched: import("convex/values").VFloat64<number, "required">;
    }, "required", "institutionId" | "products" | "name" | "logo" | "primaryColor" | "url" | "lastFetched">, {
        by_institution_id: ["institutionId", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map