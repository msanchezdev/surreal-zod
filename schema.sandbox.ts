import z from "zod/v4";
import { zodToSurql } from "./src/surql";
import sz from "./src";

const schema = z.object({
  test: z.enum(["user", "admin"]),
});

const [, DefineQuery] = zodToSurql({
  table: "user",
  exists: "overwrite",
  comment: "Comprehensive client schema demonstrating Zod v4 capabilities",
  schema: z.object({
    test: schema,
  }),
});

console.log(DefineQuery.query);
console.log("-".repeat(80));
console.log(schema._zod.def.shape.test);
console.log(
  schema.safeParse({
    test: 1,
  }),
);
