// import z from "zod/v4";
// import { zodToSurql } from "./surql";
// import { createWasmEngines } from "@surrealdb/wasm";
// import { surql, Surreal } from "surrealdb";

// // const Client = z.object({
// //   id: z.string(),
// //   name: z.object({
// //     given: z.string().min(1),
// //     family: z.string().min(1),
// //   }),

// //   identification: z
// //     .object({
// //       type: z.string(),
// //       number: z.string(),
// //     })
// //     .array(),

// //   email: z.string(),
// //   phone: z.string(),
// // });

// const [Client, DefineClient] = zodToSurql({
//   table: "client",
//   exists: "overwrite",
//   comment: "Comprehensive client schema demonstrating Zod v4 capabilities",
//   schema: z.object({
//     // Basic string types with various constraints
//     // id: z.string().uuid(),
//     username: z.string().min(3).max(20),
//     // email: z.email(),
//     // website: z.url().optional(),
//     //   // Nested objects
//     //   name: z.object({
//     //     given: z.string().min(1).max(50),
//     //     middle: z.string().max(50).optional(),
//     //     family: z.string().min(1).max(50),
//     //     prefix: z.string().max(10).optional(),
//     //     suffix: z.string().max(10).optional(),
//     //   }),
//     //   // Contact information
//     //   phone: z.object({
//     //     primary: z.string().min(10).max(15),
//     //     secondary: z.string().min(10).max(15).optional(),
//     //     countryCode: z.string().length(2),
//     //   }),
//     //   // Address with nested structure
//     //   address: z.object({
//     //     street: z.string().min(1),
//     //     unit: z.string().optional(),
//     //     city: z.string().min(1),
//     //     state: z.string().length(2),
//     //     postalCode: z.string().min(5).max(10),
//     //     country: z.string().length(2),
//     //     coordinates: z
//     //       .object({
//     //         latitude: z.number().min(-90).max(90),
//     //         longitude: z.number().min(-180).max(180),
//     //       })
//     //       .optional(),
//     //   }),
//     //   // Arrays of various types
//     //   tags: z.string().array(),
//     //   roles: z.string().array().min(1),
//     //   // Array of objects
//     //   identifications: z
//     //     .object({
//     //       type: z.string(),
//     //       number: z.string(),
//     //       issuedDate: z.string(),
//     //       expiryDate: z.string().optional(),
//     //       issuingAuthority: z.string(),
//     //     })
//     //     .array(),
//     //   // Numeric types with constraints
//     //   age: z.number().int().min(0).max(150),
//     //   accountBalance: z.number().min(0),
//     //   creditScore: z.number().int().min(300).max(850).optional(),
//     //   // Boolean flags
//     //   isActive: z.boolean(),
//     //   isVerified: z.boolean(),
//     //   hasAcceptedTerms: z.boolean(),
//     //   // Dates and timestamps
//     //   createdAt: z.string(),
//     //   updatedAt: z.string(),
//     //   lastLoginAt: z.string().optional(),
//     //   birthDate: z.string().optional(),
//     //   // Enums and literals
//     //   accountType: z.string(),
//     //   status: z.string(),
//     //   // Optional and nullable fields
//     //   bio: z.string().max(500).optional(),
//     //   avatar: z.string().url().optional(),
//     //   referralCode: z.string().length(8).optional(),
//     //   // Complex nested structure
//     //   preferences: z.object({
//     //     notifications: z.object({
//     //       email: z.boolean(),
//     //       sms: z.boolean(),
//     //       push: z.boolean(),
//     //     }),
//     //     privacy: z.object({
//     //       profileVisibility: z.string(),
//     //       showEmail: z.boolean(),
//     //       showPhone: z.boolean(),
//     //     }),
//     //     theme: z.string(),
//     //     language: z.string().length(2),
//     //   }),
//     //   // Metadata object
//     //   metadata: z
//     //     .object({
//     //       source: z.string(),
//     //       campaign: z.string().optional(),
//     //       referrer: z.string().optional(),
//     //       userAgent: z.string().optional(),
//     //       ipAddress: z.string().optional(),
//     //     })
//     //     .optional(),
//   }),
// });

// console.log(DefineClient.query);

// const surreal = new Surreal({
//   engines: createWasmEngines(),
// });
// await surreal.connect("mem://");
// // await surreal.signin({});
// await surreal.use({ namespace: "test", database: "test" });
// console.log("Connected to surrealdb");
// await surreal.query(`REMOVE DATABASE IF EXISTS test`);
// await surreal.query(DefineClient);

// console.log("\nSchema applied successfully");
// console.log("-".repeat(80));
// await introspect();
// async function introspect() {
//   const [existingTables] = await surreal
//     .query<[Record<string, string>]>(surql`(INFO FOR DATABASE).tables`)
//     .collect();

//   for (const [tableName] of Object.entries(existingTables)) {
//     console.log("Table:", tableName);
//     const [tableInfo] = await surreal
//       .query(surql`(INFO FOR TABLE ${tableName})`)
//       .collect();
//     console.log(tableInfo);
//   }
// }

// console.log("-".repeat(80));
// const testSchema = z.string().nonoptional();
// // console.log(testSchema._zod.def.checks[0]);
// console.log(testSchema.safeParse(""));

import { createNodeEngines } from "@surrealdb/node";
import { surql, Surreal } from "surrealdb";

const surreal = new Surreal({
  engines: createNodeEngines(),
});
await surreal.connect("mem://");
console.log("Connected");
