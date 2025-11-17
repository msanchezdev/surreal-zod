// const Client = z.object({
//   id: z.string(),
//   name: z.object({
//     given: z.string().min(1),
//     family: z.string().min(1),
//   }),

import z from "zod";
import { zodToSurql } from "./src/surql";
import { RecordId, surql, Surreal } from "surrealdb";
import sz from "./src";

//   identification: z
//     .object({
//       type: z.string(),
//       number: z.string(),
//     })
//     .array(),

//   email: z.string(),
//   phone: z.string(),
// });

function _________________________divider_________________________(
  text?: string,
) {
  const sides = "-".repeat(Math.floor((80 - (text?.length ?? 0)) / 2) - 1);
  if (text) {
    console.log(`${sides}${text.length % 2 === 0 ? "" : "-"} ${text} ${sides}`);
  } else {
    console.log(sides);
  }
}

_________________________divider_________________________("Schema");
const [User, DefineUser] = zodToSurql({
  table: "user",
  exists: "overwrite",
  comment: "Comprehensive client schema demonstrating Zod v4 capabilities",
  schema: sz.object({
    // Basic string types with various constraints
    // id: sz.recordId(sz.string()),
    username: sz.string().min(3).max(20),
    active: sz.boolean(),
    age: sz
      .number()
      .min(18)
      .max(100)
      .default(() => Math.floor(Math.random() * 100 + 18)),
    email: sz.email(),
    website: sz.url({ normalize: true, protocol: /https?/ }).optional(),

    // Nested objects
    name: sz
      .object({
        given: sz.string().min(1).max(50),
        middle: sz.string().max(50).optional(),
        family: sz.string().min(1).max(50),
        prefix: sz.string().max(10).optional(),
        suffix: sz.string().max(10).optional(),
      })
      .optional(),

    // Contact information
    contact_info: sz.array(
      sz.object({
        primary: sz.string().min(10).max(15),
        secondary: sz.string().min(10).max(15).optional(),
        countryCode: sz.string().length(2),
      }),
    ),
    // Address with nested structure
    address: sz.object({
      street: sz.string().min(1),
      unit: sz.string().optional(),
      city: sz.string().min(1),
      state: sz.string().length(2),
      postalCode: sz.string().min(5).max(10),
      country: sz.string().length(2),
      coordinates: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
        .optional(),
    }),
    //   // Arrays of various types
    tags: z.string().array().default([]),
    roles: z
      .string()
      .array()
      .min(1)
      .default(() => ["user"]),
    //   // Array of objects
    //   identifications: z
    //     .object({
    //       type: z.string(),
    //       number: z.string(),
    //       issuedDate: z.string(),
    //       expiryDate: z.string().optional(),
    //       issuingAuthority: z.string(),
    //     })
    //     .array(),
    //   // Numeric types with constraints
    //   age: z.number().int().min(0).max(150),
    //   accountBalance: z.number().min(0),
    //   creditScore: z.number().int().min(300).max(850).optional(),
    //   // Boolean flags
    //   isActive: z.boolean(),
    //   isVerified: z.boolean(),
    //   hasAcceptedTerms: z.boolean(),
    //   // Dates and timestamps
    //   createdAt: z.string(),
    //   updatedAt: z.string(),
    //   lastLoginAt: z.string().optional(),
    //   birthDate: z.string().optional(),
    //   // Enums and literals
    //   accountType: z.string(),
    //   status: z.string(),
    //   // Optional and nullable fields
    //   bio: z.string().max(500).optional(),
    //   avatar: z.string().url().optional(),
    //   referralCode: z.string().length(8).optional(),
    //   // Complex nested structure
    //   preferences: z.object({
    //     notifications: z.object({
    //       email: z.boolean(),
    //       sms: z.boolean(),
    //       push: z.boolean(),
    //     }),
    //     privacy: z.object({
    //       profileVisibility: z.string(),
    //       showEmail: z.boolean(),
    //       showPhone: z.boolean(),
    //     }),
    //     theme: z.string(),
    //     language: z.string().length(2),
    //   }),
    //   // Metadata object
    //   metadata: z
    //     .object({
    //       source: z.string(),
    //       campaign: z.string().optional(),
    //       referrer: z.string().optional(),
    //       userAgent: z.string().optional(),
    //       ipAddress: z.string().optional(),
    //     })
    //     .optional(),
  }),
});

_________________________divider_________________________("Query");
console.log(DefineUser.query);

const surreal = new Surreal();
await surreal.connect("ws://127.0.0.1:8000", {
  authentication: {
    username: "root",
    password: "Welc0me123.",
  },
  namespace: "test",
  database: "test",
});
await surreal.query(`REMOVE DATABASE IF EXISTS test`);
await surreal.query(DefineUser);

console.log("\nSchema applied successfully");
_________________________divider_________________________("Database State");
await introspect();
async function introspect() {
  const [existingTables] = await surreal
    .query<[Record<string, string>]>(surql`(INFO FOR DATABASE).tables`)
    .collect();

  for (const [tableName] of Object.entries(existingTables)) {
    console.log("Table:", tableName);
    const [tableInfo] = await surreal
      .query(surql`(INFO FOR TABLE ${tableName})`)
      .collect();
    console.log(tableInfo);
  }
}

_________________________divider_________________________(
  "Creating test users",
);

let user1Created = false;
try {
  const testUser1 = User.parse({
    username: "test1",
    email: "test1@test.com",
    active: true,
    website: "http://test1.test.com",
    name: {
      given: "John",
      family: "Doe",
    },
    contact_info: [
      {
        primary: "1234567890",
        secondary: undefined,
        countryCode: "+1",
      },
    ],
    address: {
      street: "123 Main St",
      unit: "Apt 1",
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "US",
      coordinates: {
        latitude: 37.774929,
        longitude: -122.419416,
      },
    },
  });
  await surreal.query(surql`UPSERT user:1 CONTENT ${testUser1}`);
  console.log("User 1 created");
  user1Created = true;
} catch (error) {
  console.error("Error creating user 1:", error);
}

let user3Created = false;
try {
  const testUser3 = User.parse({
    username: "test3",
    email: "test3@test.com",
    active: true,
    website: "http://test3.test.com",
    name: {
      given: "John",
      family: "Doe",
    },
    contact_info: [
      {
        primary: "1234567890",
        secondary: undefined,
        countryCode: "+1",
      },
    ],
    address: {
      street: "123 Main St",
      unit: "Apt 1",
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "US",
      coordinates: {
        latitude: 37.774929,
        longitude: -122.419416,
      },
    },
  });
  await surreal.query(surql`UPSERT user:3 CONTENT ${testUser3}`);
  console.log("User 3 created");
  user1Created = true;
} catch (error) {
  console.error("Error creating user 3:", error);
}

let user4Created = false;
try {
  const testUser4 = User.parse({
    username: "test4",
    email: "test4@test.com",
    active: true,
    website: "http://test4.test.com",
    name: {
      given: "John",
      family: "Doe",
    },
    contact_info: [
      {
        primary: "1234567890",
        secondary: undefined,
        countryCode: "+1",
      },
    ],
    address: {
      street: "123 Main St",
      unit: "Apt 1",
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "US",
      coordinates: {
        latitude: 37.774929,
        longitude: -122.419416,
      },
    },
  });
  await surreal.query(surql`UPSERT user:4 CONTENT ${testUser4}`);
  console.log("User 4 created");
  user4Created = true;
} catch (error) {
  console.error("Error creating user 4:", error);
}

let user5Created = false;
try {
  const testUser5 = User.parse({
    username: "test5",
    email: "test5@test.com",
    active: true,
    website: "http://test5.test.com",
    name: {
      given: "John",
      family: "Doe",
    },
    contact_info: [
      {
        primary: "1234567890",
        secondary: undefined,
        countryCode: "+1",
      },
    ],
    address: {
      street: "123 Main St",
      unit: "Apt 1",
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "US",
      coordinates: {
        latitude: 37.774929,
        longitude: -122.419416,
      },
    },
  });
  await surreal.query(surql`UPSERT user:5 CONTENT ${testUser5}`);
  console.log("User 5 created");
  user5Created = true;
} catch (error) {
  console.error("Error creating user 5:", error);
}

let user2Created = false;
try {
  await surreal.query(
    surql`UPSERT user:2 CONTENT ${{
      username: "test2",
      email: "test2@test.com",
      age: 22,
      active: true,
      website: "https://test2.test.com",
      name: {
        given: "Jane",
        family: "Doe",
      },
      contact_info: [
        {
          primary: "1234567890",
          secondary: undefined,
          countryCode: "+1",
        },
      ],
      address: {
        street: "123 Main St",
        unit: "Apt 1",
        city: "Anytown",
        state: "CA",
        postalCode: "12345",
        country: "US",
        coordinates: {
          latitude: 37.774929,
          longitude: -122.419416,
        },
      },
    }}`,
  );
  console.log("User 2 created");
  user2Created = true;
} catch (error) {
  console.error("Error creating user 2:", error);
}

if (!user1Created || !user2Created) {
  throw new Error("Failed to create users");
}

const [users] = await surreal
  .query<[z.infer<typeof User>[]]>(surql`SELECT * FROM user`)
  .collect();
_________________________divider_________________________("Raw users");
console.log(users);
_________________________divider_________________________("Parsed users");
console.log(users.map((user) => User.parse(user).id?.toString()));
_________________________divider_________________________("Sandbox");
// console.log(users.map((user) => User.parse(user)));
console.log(z.url({ normalize: true }).parse("https:test.com#test"));
await surreal.close();
