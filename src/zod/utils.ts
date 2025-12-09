import * as core from "zod/v4/core";
import type { SurrealZodTableFields } from "./schema";

export const optionalFields = core.util.optionalKeys as (
  fields: SurrealZodTableFields,
) => string[];
