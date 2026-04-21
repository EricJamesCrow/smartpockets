/**
 * Agent-scope custom function factory. Resolves the viewer from a trusted
 * userId arg (populated upstream by the HTTP action after Clerk identity
 * verification). This file is the trust boundary for every agent tool handler.
 *
 * NOTE: this is the only file in `agent/` allowed to import from
 * `../_generated/server`. All other agent code imports the `query`,
 * `mutation`, `internalQuery`, `internalMutation` wrappers from `../functions`
 * (repo-wide Ents convention), or the `agentQuery` / `agentMutation` /
 * `agentAction` exports below.
 */

import { entsTableFactory } from "convex-ents";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import {
  internalAction as baseInternalAction,
  internalMutation as baseInternalMutation,
  internalQuery as baseInternalQuery,
  QueryCtx as BaseQueryCtx,
  MutationCtx as BaseMutationCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { entDefinitions } from "../schema";

async function resolveViewer<Ctx extends BaseQueryCtx | BaseMutationCtx>(
  baseCtx: Ctx,
  userId: Id<"users">,
) {
  const table = entsTableFactory(baseCtx as BaseMutationCtx, entDefinitions);
  const viewer = await table("users").getX(userId);
  const viewerX = () => viewer;
  return { table, viewer, viewerX };
}

export const agentQuery = customQuery(
  baseInternalQuery,
  customCtx(async (baseCtx: BaseQueryCtx, { userId }: { userId: Id<"users"> }) => {
    const { table, viewer, viewerX } = await resolveViewer(baseCtx, userId);
    return { table, viewer, viewerX };
  }),
);

export const agentMutation = customMutation(
  baseInternalMutation,
  customCtx(async (baseCtx: BaseMutationCtx, { userId }: { userId: Id<"users"> }) => {
    const { table, viewer, viewerX } = await resolveViewer(baseCtx, userId);
    return { table, viewer, viewerX };
  }),
);

// Actions do not receive the Ents table ctx; they resolve viewer via ctx.runQuery.
export const agentAction = baseInternalAction;
