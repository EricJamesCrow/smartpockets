import { GenericEnt, GenericEntWriter } from "convex-ents";
import { CustomCtx } from "convex-helpers/server/customFunctions";
import { TableNames } from "./_generated/dataModel";
import { mutation, query } from "./functions";
import { entDefinitions } from "./schema";

export type QueryCtx = CustomCtx<typeof query>;
export type MutationCtx = CustomCtx<typeof mutation>;

export type Ent<T extends TableNames> = GenericEnt<typeof entDefinitions, T>;
export type EntWriter<T extends TableNames> = GenericEntWriter<
  typeof entDefinitions,
  T
>;
