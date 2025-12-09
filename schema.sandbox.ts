import z from "zod/v4";
import sz from "./src";
import { RecordId, Surreal } from "surrealdb";
import { inspect } from "bun";

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

// const surreal = new Surreal();
// await surreal.connect("ws://127.0.0.1:8000", {
//   authentication: {
//     username: "root",
//     password: "Welc0me123.",
//   },
//   namespace: "test",
//   database: "test",
// });
// // await surreal.query(`REMOVE DATABASE IF EXISTS test`);
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

const schema = sz.object({
  name: sz.string(),
  age: sz.number(),
});

console.log(
  schema.parse({
    name: "John Doe",
    age: 17,
    meta: { created: new Date() },
  }),
);
