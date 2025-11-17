import type { SurrealZodTableFields } from "./schema";
import * as core from "zod/v4/core";

export const optionalFields = core.util.optionalKeys as (
  fields: SurrealZodTableFields,
) => string[];
