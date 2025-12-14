import { DateTime, Decimal, RecordId, Uuid } from "surrealdb";
import { z } from "./src";

// import { createNodeEngines } from "@surrealdb/node";
// import z, { sz } from "./src";
// import { defineField } from "./src/surql";

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

// const surreal = new Surreal({
//   // engines: createNodeEngines(),
// });
// await surreal.connect("ws://127.0.0.1:8000", {
//   authentication: {
//     username: "root",
//     password: "Welc0me123.",
//   },
//   namespace: "test",
//   database: "test",
// });

// await surreal.use({ namespace: "test", database: "test" });

// const input = "a";

// const withAny = z.recordId("user").type(z.tuple([z.string(), z.number()]));
const schema = z
  .table("bought")
  .relation()
  // .from(z.recordId("user").type(z.string()))
  // .to(z.recordId("order").type(z.number()))
  .fields({
    id: z.recordId(["user", "order"]).type(z.number().array()),
    name: z.string(),
    // in: z.recordId("client").type(z.string()),
    // out: z.recordId("product").type(z.number()),
    age: z.number(),
    meta: z.object({
      created_at: z.date(),
      updated_at: z.date(),
    }),
  })
  // .schemafull()
  .extend({
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    }),
  })
  .partial({ in: true });
// .dto()

const result = schema.safeParse({
  // name: "John Doe",
  // age: 18,
  // in: new RecordId("employee", "123"),
  // out: new RecordId("order", 456),
  // meta: {
  //   created_at: new Date("2025-01-01T00:00:00Z"),
  //   updated_at: new Date("2025-01-01T00:00:00Z"),
  // },
});
console.log(result);
// console.log(result.data!.);
// console.log(schema.safeParse(new RecordId("test", "123")));

// const schema = sz.recordId().type(z.null());
// console.log(sz.recordId().isOptional);
// const result = defineField("name", "user", schema);
// console.log(result.query);

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
