import z from "zod/v4";

export type SurrealZodCacheMeta = { type: string };

const tables = z.registry();

export const registries = Object.freeze({
  tables,
});
