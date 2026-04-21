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
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { v } from "convex/values";
import {
  internalAction as baseInternalAction,
  internalMutation as baseInternalMutation,
  internalQuery as baseInternalQuery,
} from "../_generated/server";
import { entDefinitions } from "../schema";

export const agentQuery = customQuery(baseInternalQuery, {
  args: { userId: v.id("users") },
  input: async (baseCtx, { userId }) => {
    const table = entsTableFactory(baseCtx, entDefinitions);
    const viewer = await table("users").getX(userId);
    return {
      ctx: {
        ...baseCtx,
        table,
        viewer,
        viewerX: () => viewer,
      },
      args: {},
    };
  },
});

export const agentMutation = customMutation(baseInternalMutation, {
  args: { userId: v.id("users") },
  input: async (baseCtx, { userId }) => {
    const table = entsTableFactory(baseCtx, entDefinitions);
    const viewer = await table("users").getX(userId);
    return {
      ctx: {
        ...baseCtx,
        table,
        viewer,
        viewerX: () => viewer,
      },
      args: {},
    };
  },
});

// Actions do not receive the Ents table ctx; they resolve viewer via ctx.runQuery.
export const agentAction = baseInternalAction;
