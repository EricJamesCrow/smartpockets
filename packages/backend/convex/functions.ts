import { entsTableFactory } from "convex-ents";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server";
import { DataModel } from "./_generated/dataModel";
import {
  query as baseQuery,
  mutation as baseMutation,
  internalQuery as baseInternalQuery,
  internalMutation as baseInternalMutation,
  QueryCtx as BaseQueryCtx,
  MutationCtx as BaseMutationCtx,
} from "./_generated/server";
import { entDefinitions } from "./schema";

// Legacy tables that still use ctx.db (not yet migrated to Ents)
type LegacyTables = "userPreferences" | "paymentAttempts";

async function queryCtx(baseCtx: BaseQueryCtx) {
  const table = entsTableFactory(baseCtx, entDefinitions);

  // Resolve viewer from Clerk auth
  const identity = await baseCtx.auth.getUserIdentity();
  const viewer = identity
    ? await table("users").get("externalId", identity.subject)
    : null;

  const viewerX = () => {
    if (!viewer) throw new Error("Authentication required");
    return viewer;
  };

  return {
    ...baseCtx,
    // Expose db only for legacy tables
    db: baseCtx.db as unknown as GenericDatabaseReader<
      Pick<DataModel, LegacyTables>
    >,
    table,
    viewer,
    viewerX,
  };
}

async function mutationCtx(baseCtx: BaseMutationCtx) {
  const table = entsTableFactory(baseCtx, entDefinitions);

  // Resolve viewer from Clerk auth
  const identity = await baseCtx.auth.getUserIdentity();
  const viewer = identity
    ? await table("users").get("externalId", identity.subject)
    : null;

  const viewerX = () => {
    if (!viewer) throw new Error("Authentication required");
    return viewer;
  };

  return {
    ...baseCtx,
    // Expose db only for legacy tables
    db: baseCtx.db as GenericDatabaseWriter<Pick<DataModel, LegacyTables>>,
    table,
    viewer,
    viewerX,
  };
}

export const query = customQuery(baseQuery, customCtx(queryCtx));
export const internalQuery = customQuery(baseInternalQuery, customCtx(queryCtx));
export const mutation = customMutation(baseMutation, customCtx(mutationCtx));
export const internalMutation = customMutation(
  baseInternalMutation,
  customCtx(mutationCtx)
);
