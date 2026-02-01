/**
 * Transaction Queries
 *
 * All read operations for transactions using the Plaid component.
 * Data source: @crowdevelopment/convex-plaid component
 *
 * SECURITY: All queries verify ownership by deriving userId from auth context.
 */

import { v } from "convex/values";
import { query } from "../functions";
import { components } from "../_generated/api";
import {
  enrichTransactionWithMerchant,
  type MerchantEnrichmentResult,
} from "./helpers";

/**
 * Get combined transactions and recurring streams for an account
 *
 * Merges regular transactions and recurring streams into a unified array
 * for display in transaction tables. Recurring streams are transformed
 * to match transaction shape with a 'recurring' type indicator.
 *
 * SECURITY: Verifies accountId belongs to authenticated user's Plaid items.
 *
 * @param accountId - Plaid account_id
 * @returns Combined array of transactions and streams, sorted by date (newest first)
 */
export const getTransactionsAndStreamsByAccountId = query({
  args: {
    accountId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    limit: v.optional(v.number()), // Max items to return (for infinite scroll)
    searchQuery: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()), // 'Posted' | 'Pending' | 'all'
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auth check - derive userId from viewer context
    const viewer = ctx.viewerX();
    const userId = viewer.externalId; // Clerk user ID

    // Get user's active Plaid items to verify ownership
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // Get all accounts for user's active items and verify accountId belongs to user
    let accountBelongsToUser = false;
    for (const itemId of activeItemIds) {
      const itemAccounts = await ctx.runQuery(components.plaid.public.getAccountsByItem, {
        plaidItemId: itemId,
      });
      if (itemAccounts.some((acc) => acc.accountId === args.accountId)) {
        accountBelongsToUser = true;
        break;
      }
    }

    if (!accountBelongsToUser) {
      throw new Error("Unauthorized: Account does not belong to user");
    }

    // Get regular transactions from component
    const rawTransactions = await ctx.runQuery(
      components.plaid.public.getTransactionsByAccount,
      { accountId: args.accountId }
    );

    // Enrich transactions with merchant data (with cache to deduplicate)
    const merchantCache = new Map<string, MerchantEnrichmentResult>();
    const transactions = await Promise.all(
      rawTransactions.map((tx) =>
        enrichTransactionWithMerchant(ctx, tx, merchantCache)
      )
    );

    // Get recurring streams for this user from component
    const allStreams = await ctx.runQuery(
      components.plaid.public.getRecurringStreamsByUser,
      { userId }
    );

    // Filter streams to only those for this account
    const streams = allStreams.filter(
      (stream) => stream.accountId === args.accountId
    );

    // Transform streams to match transaction shape
    const transformedStreams = streams.map((stream) => ({
      _id: stream._id,
      userId: stream.userId,
      plaidItemId: stream.plaidItemId,
      accountId: args.accountId,
      transactionId: stream.streamId, // Use streamId as transactionId
      amount: stream.lastAmount,
      isoCurrencyCode: stream.isoCurrencyCode,
      date: stream.lastDate ?? stream.firstDate ?? "",
      datetime: undefined,
      authorizedDate: undefined,
      authorizedDatetime: undefined,
      name: stream.description,
      merchantName: stream.merchantName,
      pending: false,
      pendingTransactionId: undefined,
      categoryId: undefined,
      categoryPrimary: stream.category ?? undefined,
      categoryDetailed: undefined,
      paymentChannel: undefined,
      location: undefined,
      enrichmentData: undefined,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
      // Special fields for recurring streams
      type: "recurring" as const,
      frequency: stream.frequency,
      status: stream.status,
      streamType: stream.type,
      averageAmount: stream.averageAmount,
      firstDate: stream.firstDate,
      predictedNextDate: stream.predictedNextDate,
      // Add merchantEnrichment for consistency
      merchantEnrichment: stream.merchantName
        ? {
            merchantName: stream.merchantName,
            logoUrl: undefined,
            categoryPrimary: undefined,
            categoryIconUrl: undefined,
            confidenceLevel: "UNKNOWN" as const,
          }
        : null,
    }));

    // Combine and sort by date (newest first)
    let combined = [
      ...transactions.map((t) => ({ ...t, type: "transaction" as const })),
      ...transformedStreams,
    ];

    combined.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply server-side filters (optional)
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      combined = combined.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.merchantName?.toLowerCase().includes(query)
      );
    }

    if (args.category && args.category !== "all") {
      combined = combined.filter(
        (item) =>
          item.categoryDetailed === args.category ||
          item.categoryPrimary === args.category
      );
    }

    if (args.status && args.status !== "all") {
      const isPending = args.status === "Pending";
      combined = combined.filter((item) => item.pending === isPending);
    }

    if (args.dateFrom || args.dateTo) {
      combined = combined.filter((item) => {
        const itemDate = new Date(item.date);
        if (args.dateFrom && itemDate < new Date(args.dateFrom)) return false;
        if (args.dateTo && itemDate > new Date(args.dateTo)) return false;
        return true;
      });
    }

    // Apply limit for infinite scroll mode (default: 1000)
    const totalCount = combined.length;
    const limit = args.limit ?? 1000;
    const hasMore = totalCount > limit;

    // Apply limit when not using pagination
    if (args.page === undefined && args.pageSize === undefined) {
      combined = combined.slice(0, limit);
    }

    // Return ALL items if no pagination params provided (for virtual lists)
    // Otherwise return paginated results (backward compatibility)
    if (args.page === undefined && args.pageSize === undefined) {
      return {
        items: combined,
        hasMore,
        pagination: {
          page: 1,
          pageSize: combined.length,
          totalCount,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Legacy pagination support
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = combined.slice(startIndex, endIndex);

    return {
      items,
      hasMore: false,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },
});

/**
 * Get transactions by account (with merchant enrichment)
 *
 * @param accountId - Plaid account_id
 * @returns Array of transactions with merchant enrichment data
 */
export const getTransactionsByAccountId = query({
  args: { accountId: v.string() },
  handler: async (ctx, args) => {
    // Get transactions from component
    const transactions = await ctx.runQuery(
      components.plaid.public.getTransactionsByAccount,
      { accountId: args.accountId }
    );

    // Enrich with merchant data (with cache to deduplicate)
    const merchantCache = new Map<string, MerchantEnrichmentResult>();
    return await Promise.all(
      transactions.map((tx) =>
        enrichTransactionWithMerchant(ctx, tx, merchantCache)
      )
    );
  },
});

/**
 * List all transactions across all connected credit cards for a user
 *
 * Aggregates transactions from all accounts that have a matching creditCard record.
 * Attaches source info (card details) to each transaction for display.
 *
 * SECURITY: Verifies ownership via authenticated user context.
 *
 * @param page - Page number (1-indexed), default 1
 * @param pageSize - Items per page, default 50
 * @param searchQuery - Filter by merchant name or transaction name
 * @param category - Filter by transaction category
 * @param status - Filter by "all" | "posted" | "pending"
 * @param dateFrom - Filter transactions on or after this date (ISO string)
 * @param dateTo - Filter transactions on or before this date (ISO string)
 * @param cardIds - Filter to specific credit cards
 * @param amountMin - Minimum transaction amount (in dollars)
 * @param amountMax - Maximum transaction amount (in dollars)
 * @returns { items, pagination }
 */
export const listAllForUser = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    searchQuery: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()), // "all" | "posted" | "pending"
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    cardIds: v.optional(v.array(v.id("creditCards"))),
    amountMin: v.optional(v.number()),
    amountMax: v.optional(v.number()),
  },
  returns: v.object({
    items: v.array(
      v.object({
        _id: v.string(),
        transactionId: v.string(),
        accountId: v.string(),
        amount: v.number(),
        isoCurrencyCode: v.optional(v.string()),
        date: v.string(),
        datetime: v.optional(v.string()),
        name: v.string(),
        merchantName: v.optional(v.string()),
        pending: v.boolean(),
        categoryPrimary: v.optional(v.string()),
        categoryDetailed: v.optional(v.string()),
        createdAt: v.number(),
        merchantEnrichment: v.optional(
          v.union(
            v.object({
              merchantName: v.string(),
              logoUrl: v.optional(v.string()),
              categoryPrimary: v.optional(v.string()),
              categoryIconUrl: v.optional(v.string()),
              confidenceLevel: v.string(),
            }),
            v.null()
          )
        ),
        sourceInfo: v.object({
          cardId: v.string(),
          displayName: v.string(),
          lastFour: v.optional(v.string()),
          brand: v.optional(v.string()),
          institutionName: v.optional(v.string()),
        }),
      })
    ),
    pagination: v.object({
      page: v.number(),
      pageSize: v.number(),
      totalCount: v.number(),
      totalPages: v.number(),
      hasNextPage: v.boolean(),
      hasPreviousPage: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    // Auth check - derive userId from viewer context
    const viewer = ctx.viewerX();
    const userId = viewer.externalId; // Clerk user ID

    // Get user's active Plaid items
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // If no active items, return empty result
    if (activeItemIds.size === 0) {
      return {
        items: [],
        pagination: {
          page: args.page ?? 1,
          pageSize: args.pageSize ?? 50,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Get user's credit cards (filtered by active Plaid items)
    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    // Filter cards by active Plaid items (manual cards always included)
    const cards = allCards.filter(
      (card) => !card.plaidItemId || activeItemIds.has(card.plaidItemId)
    );

    // If cardIds filter provided, further filter cards
    let filteredCards = cards;
    if (args.cardIds && args.cardIds.length > 0) {
      const cardIdSet = new Set(args.cardIds);
      filteredCards = cards.filter((card) => cardIdSet.has(card._id));
    }

    // Build accountId → card info lookup
    const accountToCardMap = new Map<
      string,
      {
        cardId: string;
        displayName: string;
        lastFour: string | undefined;
        brand: string | undefined;
        institutionName: string | undefined;
      }
    >();
    for (const card of filteredCards) {
      accountToCardMap.set(card.accountId, {
        cardId: card._id,
        displayName: card.displayName,
        lastFour: card.lastFour,
        brand: card.brand,
        institutionName: card.company,
      });
    }

    // If no cards match filters, return empty result
    if (accountToCardMap.size === 0) {
      return {
        items: [],
        pagination: {
          page: args.page ?? 1,
          pageSize: args.pageSize ?? 50,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Get all accounts for active items
    const allAccountIds = new Set<string>();
    for (const itemId of activeItemIds) {
      const itemAccounts = await ctx.runQuery(components.plaid.public.getAccountsByItem, {
        plaidItemId: itemId,
      });
      for (const acc of itemAccounts) {
        // Only include accounts that have a matching credit card record
        if (accountToCardMap.has(acc.accountId)) {
          allAccountIds.add(acc.accountId);
        }
      }
    }

    // Type for Plaid transaction with enrichment
    type PlaidTransactionWithEnrichment = Awaited<
      ReturnType<typeof ctx.runQuery<typeof components.plaid.public.getTransactionsByAccount>>
    >[number] & {
      merchantEnrichment: MerchantEnrichmentResult;
    };

    type SourceInfo = {
      cardId: string;
      displayName: string;
      lastFour: string | undefined;
      brand: string | undefined;
      institutionName: string | undefined;
    };

    // Fetch transactions for all relevant accounts
    const allTransactions: Array<PlaidTransactionWithEnrichment & { sourceInfo: SourceInfo }> = [];

    const merchantCache = new Map<string, MerchantEnrichmentResult>();

    for (const accountId of allAccountIds) {
      const rawTransactions = await ctx.runQuery(
        components.plaid.public.getTransactionsByAccount,
        { accountId }
      );

      const sourceInfo = accountToCardMap.get(accountId)!;

      // Enrich transactions with merchant data
      const enrichedTransactions = await Promise.all(
        rawTransactions.map((tx) =>
          enrichTransactionWithMerchant(ctx, tx, merchantCache)
        )
      );

      for (const tx of enrichedTransactions) {
        allTransactions.push({
          ...(tx as PlaidTransactionWithEnrichment),
          sourceInfo,
        });
      }
    }

    // Work with the transactions array
    let transactions = allTransactions;

    // Apply filters

    // Search query filter
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      transactions = transactions.filter(
        (tx) =>
          tx.name.toLowerCase().includes(query) ||
          tx.merchantName?.toLowerCase().includes(query) ||
          tx.merchantEnrichment?.merchantName?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (args.category && args.category !== "all") {
      transactions = transactions.filter(
        (tx) =>
          tx.categoryDetailed === args.category ||
          tx.categoryPrimary === args.category
      );
    }

    // Status filter (pending vs posted)
    if (args.status && args.status !== "all") {
      const isPending = args.status === "pending";
      transactions = transactions.filter((tx) => tx.pending === isPending);
    }

    // Date range filter
    if (args.dateFrom || args.dateTo) {
      transactions = transactions.filter((tx) => {
        const txDate = new Date(tx.date);
        if (args.dateFrom && txDate < new Date(args.dateFrom)) return false;
        if (args.dateTo && txDate > new Date(args.dateTo)) return false;
        return true;
      });
    }

    // Amount filter (amounts in database may be in different formats)
    // Plaid amounts are positive for debits (money leaving account) and negative for credits
    if (args.amountMin !== undefined || args.amountMax !== undefined) {
      transactions = transactions.filter((tx) => {
        // Use absolute value for amount comparison
        const absAmount = Math.abs(tx.amount);
        if (args.amountMin !== undefined && absAmount < args.amountMin) return false;
        if (args.amountMax !== undefined && absAmount > args.amountMax) return false;
        return true;
      });
    }

    // Sort by date descending (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Pagination
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 50;
    const totalCount = transactions.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    // Map to only include fields in the return validator (strip extra Plaid fields)
    const items = paginatedTransactions.map((tx) => ({
      _id: tx._id,
      transactionId: tx.transactionId,
      accountId: tx.accountId,
      amount: tx.amount,
      isoCurrencyCode: tx.isoCurrencyCode,
      date: tx.date,
      datetime: tx.datetime,
      name: tx.name,
      merchantName: tx.merchantName,
      pending: tx.pending,
      categoryPrimary: tx.categoryPrimary,
      categoryDetailed: tx.categoryDetailed,
      createdAt: tx.createdAt,
      merchantEnrichment: tx.merchantEnrichment,
      sourceInfo: tx.sourceInfo,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },
});
