// @ts-nocheck

import {
  d,
  DateTime,
  Decimal,
  FileRef,
  RecordId,
  surql,
  Surreal,
} from "surrealdb";
import { inspect } from "bun";
import { createNodeEngines } from "@surrealdb/node";
import z, { sz } from "./src";
import { defineField } from "./src/surql";

// const Client = sz.table("client").fields({
//   id: sz.string(),
// });
// const Order = sz.table("order").fields({
//   id: sz.number(),
// });
// const User = sz
//   .table("user")
//   .schemafull()
//   .fields({
//     // id: sz.string(),
//     name: sz.string(),
//     client: Client.record().optional(),
//     meta: sz.unknown(),
//   })
//   .comment("This table contains user information");

// // const parsedUser = z.safeParse(User, {
// //   id: new RecordId("user", "123"),
// //   name: "John Doe",
// // });
// // parsedUser.data;
// // console.log(parsedUser);
// // console.log("-".repeat(80));

const surreal = new Surreal({
  // engines: createNodeEngines(),
});
await surreal.connect("ws://127.0.0.1:8000", {
  authentication: {
    username: "root",
    password: "Welc0me123.",
  },
  namespace: "test",
  database: "test",
});

await surreal.use({ namespace: "test", database: "test" });

const input = "a";
const schema = sz.recordId();
console.log(sz.recordId().isOptional);
const result = defineField("name", "user", schema);
console.log(result.query);

// function format(value: string | number | bigint | Decimal) {
//   const suffix =
//     value instanceof Float
//       ? "f"
//       : value instanceof Decimal
//         ? "dec"
//         : typeof value === "bigint"
//           ? "n"
//           : "";
//   return `\x1b[33m${value}${suffix}\x1b[0m`;
// }

// const [result] = await surreal
//   .query(surql`
//     ${new FileRef("root", "hello.txt")}
//   `)
//   .collect();

// user.meta = undefined;
// const [updated] = await surreal
//   .query(surql`UPDATE ONLY user:1 MERGE ${user}`)
//   .collect();
// console.log("Updated user:", updated);

// const schema = z.intersection(
//   z.object({ name: z.string(), age: z.bigint() }),
//   z.object({ name: z.string(), age: z.number().optional() }),
// );
// type Prettify<T> = {
//   [K in keyof T]: T[K];
// };
// type Result = Prettify<z.output<typeof schema>>;
// //    ^?

// console.log(defineField("name", "user", schema).query);
// console.log(
//   schema.safeParse({
//     name: "John Doe",
//     age: 18,
//   }),
// );

// const value = new Decimal("0.125");
// const parts = value.toParts();
// console.log("       int:", parts.int);
// console.log("      frac:", parts.frac);
// console.log("     scale:", parts.scale);
// console.log("--------------------------------");
// console.log("    bigint:", value.toBigInt());
// console.log("scientific:", value.toScientific());
// console.log("    string:", value.toString());

// await surreal.connect("ws://127.0.0.1:8000", {
//   authentication: {
//     username: "root",
//     password: "Welc0me123.",
//   },
//   namespace: "test",
//   database: "test",
// });
// // await surreal.query(`REMOVE DATABzASE IF EXISTS test`);
// // const query = User.toSurql("define");
// // console.log(query.query);
// // console.log(await surreal.query(query).collect());
// // // console.log(
// // //   inspect(await surreal.query(User.toSurql("structure")).collect(), {
// // //     colors: true,
// // //   }),
// // // );
// const schema = // .relation()
//   sz
//     .table("user")
//     // .relation()
//     // .from(Client.record())
//     // .to(Order.record())
//     // .schemafull()
//     // .schemaless()
//     // .drop()
//     .fields({
//       id: sz.any(),
//       name: sz.string(),
//       age: sz.number().optional().optional(),
//     });

// // schema._zod.def.fields.

// const query = schema.toSurql("define", { exists: "overwrite", fields: true });
// console.log(query.query);
// const [result] = await surreal.query(query).collect();
// console.log(result);
// // const result = schema.parse("Hello World");
// // console.log(result);

// const schema = sz.object({
//   name: sz.string(),
//   age: sz.number(),
// });
// const schema = z.uuid();
// async function test(testcase: string) {
//   const zodResult = await schema.safeParseAsync(testcase);
//   const surrealResult = await surreal
//     .query(`u"${testcase}"`)
//     .collect()
//     .then((result) => result[0]!.toString())
//     .catch((error) => false);

//   return {
//     zod: zodResult.data ?? zodResult.error.issues[0].message,
//     surreal: surrealResult,
//     matches: surrealResult === zodResult.data,
//   };
// }

// function testAll(arr: string[]) {
//   return Promise.all(arr.map(test));
// }

// console.log("1. Invalid Variant (bits 10xx required but violated)");
// console.log(
//   await testAll([
//     "123e4567-e89b-42d3-0456-426614174000",
//     "123e4567-e89b-42d3-3456-426614174000",
//     "123e4567-e89b-42d3-f456-426614174000",
//   ]),
// );

// console.log("2. Invalid Version (must be 1–5 but using weird values)");
// console.log(
//   await testAll([
//     "123e4567-e89b-a2d3-a456-426614174000",
//     "123e4567-e89b-02d3-a456-426614174000",
//     "123e4567-e89b-f2d3-a456-426614174000",
//   ]),
// );

// console.log("3. Version Bits OK, Variant Bits OK, but Reserved Bits Wrong");
// console.log(
//   await testAll([
//     "123e4567-e89b-12d3-b056-026614174000",
//     "123e4567-e89b-12d3-9456-126614174000",
//   ]),
// );

// console.log("4. Node ID is all zeros (not allowed for some UUID versions)");
// console.log(
//   await testAll([
//     "f47ac10b-58cc-11cf-a903-000000000000",
//     "de305d54-75b4-431b-adb2-000000000000",
//   ]),
// );

// console.log("5. Clock sequence has reserved bits flipped");
// console.log(
//   await testAll([
//     "f47ac10b-58cc-11cf-c103-426614174000",
//     "f47ac10b-58cc-11cf-d903-426614174000",
//   ]),
// );

// console.log("6. Looks like a v4 UUID but version nibble mismatched");
// console.log(
//   await testAll([
//     "550e8400-e29b-41d4-c766-42661417000f",
//     "550e8400-e29b-41d4-c766-42661417ffff",
//   ]),
// );
